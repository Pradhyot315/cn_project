"""
Pytest suite for Interactive Experiment Lab backend endpoints and engine.
"""

import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from backend.main import app
from pipeline.feature_map import FEATURE_NAMES

client = TestClient(app)


def test_preset_flows():
    res = client.get("/api/experiment/preset-flows")
    assert res.status_code == 200
    data = res.json()
    assert "benign_example" in data
    assert "attack_example" in data
    assert len(data["benign_example"]["features_norm"]) == 16
    assert len(data["attack_example"]["features_norm"]) == 16
    assert data["benign_example"]["true_label"] == 0
    assert data["attack_example"]["true_label"] == 1


def test_manual_flow_valid():
    sample = [0.1] * 16
    res = client.post("/api/experiment/manual-flow", json={
        "features": sample,
        "model_choice": "both"
    })
    assert res.status_code == 200
    data = res.json()
    assert "raw_features" in data
    assert "normalized_features" in data
    assert "fp32" in data
    assert "int8" in data
    assert "comparison" in data
    assert data["fp32"]["prediction"] in [0, 1]
    assert data["int8"]["prediction"] in [0, 1]
    assert 0.0 <= data["fp32"]["probability"] <= 1.0
    assert 0.0 <= data["int8"]["probability"] <= 1.0
    assert "latency_badge" in data
    assert "disclaimer" in data


def test_manual_flow_invalid():
    # Wrong number of features
    res = client.post("/api/experiment/manual-flow", json={
        "features": [0.1] * 10,
        "model_choice": "both"
    })
    assert res.status_code == 422  # Pydantic validation error

    # Negative value
    res2 = client.post("/api/experiment/manual-flow", json={
        "features": [-5.0] + [0.1] * 15,
        "model_choice": "both"
    })
    assert res2.status_code == 400


def test_experiment_unlabeled_flow():
    # 1. Create a dummy CSV without labels
    csv_data = {}
    for f in FEATURE_NAMES:
        csv_data[f] = [10.0, 20.0, 30.0, 40.0, 50.0]
    df = pd.DataFrame(csv_data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    # 2. Inspect dataset
    inspect_res = client.post(
        "/api/experiment/inspect-dataset",
        files={"file": ("unlabeled_sample.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert inspect_res.status_code == 200
    inspect_data = inspect_res.json()
    file_id = inspect_data["file_id"]
    assert inspect_data["row_count"] == 5
    assert inspect_data["col_count"] == 16

    # 3. Run experiment without labels
    mapping = {f: f for f in FEATURE_NAMES}
    run_res = client.post("/api/experiment/run", json={
        "file_id": file_id,
        "feature_mapping": mapping,
        "label_column": None
    })
    assert run_res.status_code == 200
    run_data = run_res.json()
    run_id = run_data["run_id"]
    assert run_data["has_labels"] is False
    assert run_data["step3_fp32"]["status"] == "completed"
    assert run_data["step4_int8"]["status"] == "completed"
    assert run_data["step5_comparison"]["status"] == "completed"
    # Step 6 must be skipped / not applicable
    assert run_data["step6_evaluation"]["status"] == "not_applicable"
    # Step 7 completes output agreement & wilcoxon, but correctness McNemar requires ground-truth labels
    assert run_data["step7_statistics"]["status"] == "completed"
    assert "wilcoxon_probabilities" in run_data["step7_statistics"]
    assert "Not applicable" in str(run_data["step7_statistics"]["mcnemar_correctness"])
    assert run_data["step8_benchmark"]["status"] == "completed"
    assert run_data["step9_projection"]["status"] == "completed"

    # 4. Export JSON
    json_export = client.get(f"/api/experiment/export/{run_id}/json")
    assert json_export.status_code == 200
    assert "run_id" in json_export.json()

    # 5. Export CSV
    csv_export = client.get(f"/api/experiment/export/{run_id}/csv")
    assert csv_export.status_code == 200
    assert "fp32_prediction" in csv_export.text


def test_experiment_labeled_flow():
    # 1. Create a dummy CSV with labels
    csv_data = {}
    for f in FEATURE_NAMES:
        csv_data[f] = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]
    csv_data["my_label"] = [0, 1, 0, 1, 0, 1]
    df = pd.DataFrame(csv_data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    # 2. Inspect dataset
    inspect_res = client.post(
        "/api/experiment/inspect-dataset",
        files={"file": ("labeled_sample.csv", io.BytesIO(csv_bytes), "text/csv")}
    )
    assert inspect_res.status_code == 200
    file_id = inspect_res.json()["file_id"]

    # 3. Run experiment with label
    mapping = {f: f for f in FEATURE_NAMES}
    run_res = client.post("/api/experiment/run", json={
        "file_id": file_id,
        "feature_mapping": mapping,
        "label_column": "my_label",
        "positive_label_value": "1"
    })
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["has_labels"] is True
    # Step 6 and 7 should be completed
    assert run_data["step6_evaluation"]["status"] == "completed"
    assert "fp32_metrics" in run_data["step6_evaluation"]
    assert "int8_metrics" in run_data["step6_evaluation"]
    assert run_data["step7_statistics"]["status"] == "completed"
    assert "mcnemar_predictions" in run_data["step7_statistics"]
    assert "mcnemar_correctness" in run_data["step7_statistics"]
    assert isinstance(run_data["step7_statistics"]["mcnemar_correctness"], dict)
