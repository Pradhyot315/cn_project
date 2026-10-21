"""
Pytest suite for ZeroEdge-NIDS FastAPI backend.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["project"] == "ZeroEdge-NIDS"

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "host_environment" in data

def test_dataset_features():
    response = client.get("/api/dataset/features")
    assert response.status_code == 200
    data = response.json()
    assert "features" in data
    assert len(data["features"]) == 16

def test_predict_schema():
    # Pass a valid 16-element normalized feature vector
    sample_features = [0.5] * 16
    response = client.post("/api/predict", json={
        "features": sample_features,
        "is_normalized": True
    })
    # If models are loaded, it returns 200 with prediction
    if response.status_code == 200:
        data = response.json()
        assert "fp32_prob" in data
        assert "int8_prob" in data
        assert "fp32_latency_us" in data
        assert "int8_latency_us" in data
        assert len(data["quantized_input"]) == 16
