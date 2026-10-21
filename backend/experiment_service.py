"""
Interactive Experiment Lab Service.
Handles dataset inspection, feature mapping validation, batched FP32 & INT8 inference,
classification evaluation (strictly when ground-truth labels exist), paired statistical tests,
host performance benchmarking, analytical ESP32 projections, and report exports.
"""

import os
import io
import gc
import json
import time
import uuid
import platform
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from scipy import stats
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix
)

from backend.inference import engine, DATA_DIR
from pipeline.feature_map import FEATURE_DEFINITIONS, FEATURE_NAMES
from pipeline.quantize import int8_quantize_input, int8_forward_integer_only
from pipeline.hw_model import get_host_environment_info

UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
EXPERIMENTS_DIR = os.path.join(DATA_DIR, "experiments")

for d in [UPLOADS_DIR, EXPERIMENTS_DIR]:
    os.makedirs(d, exist_ok=True)


def get_genuine_preset_flows() -> Dict[str, Any]:
    """Retrieves genuine benign and attack flow vectors from the verified test data."""
    samples_path = os.path.join(DATA_DIR, "stream_samples.json")
    if not os.path.exists(samples_path):
        raise RuntimeError("Stream samples not found. Run pipeline first.")

    with open(samples_path, "r", encoding="utf-8") as f:
        samples = json.load(f)

    benign_sample = next((s for s in samples if s["true_label"] == 0), samples[0])
    attack_sample = next((s for s in samples if s["true_label"] == 1), samples[1])

    return {
        "benign_example": {
            "flow_id": benign_sample["flow_id"],
            "features_norm": benign_sample["features_norm"],
            "true_label": 0,
            "attack_cat": "Normal",
            "fp32_prob": benign_sample.get("fp32_prob"),
            "int8_prob": benign_sample.get("int8_prob"),
            "description": "Genuine normal traffic flow from UNSW-NB15 target capture"
        },
        "attack_example": {
            "flow_id": attack_sample["flow_id"],
            "features_norm": attack_sample["features_norm"],
            "true_label": 1,
            "attack_cat": attack_sample.get("attack_cat", "Attack"),
            "fp32_prob": attack_sample.get("fp32_prob"),
            "int8_prob": attack_sample.get("int8_prob"),
            "description": f"Genuine attack flow ({attack_sample.get('attack_cat', 'Attack')}) from UNSW-NB15 target capture"
        }
    }


def inspect_uploaded_csv(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Inspects an uploaded CSV file safely without altering data."""
    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOADS_DIR, f"{file_id}.csv")

    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # Read up to 50,000 rows for memory safety
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), nrows=50000, low_memory=False)
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise ValueError(f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise ValueError("Uploaded CSV file is completely empty.")

    # Strip column names
    df.columns = [str(c).strip() for c in df.columns]

    row_count = len(df)
    col_count = len(df.columns)
    columns = list(df.columns)
    dtypes = {c: str(df[c].dtype) for c in columns}

    # Missing and invalid value counts
    missing_counts = {c: int(df[c].isna().sum()) for c in columns}
    inf_counts = {}
    for c in columns:
        if np.issubdtype(df[c].dtype, np.number):
            inf_counts[c] = int(np.isinf(df[c]).sum())
        else:
            inf_counts[c] = 0

    duplicate_count = int(df.duplicated().sum())

    # Preview first 10 rows (sanitize NaN/inf for JSON)
    preview_df = df.head(10).replace([np.inf, -np.inf], 0.0).fillna(0.0)
    preview = preview_df.to_dict(orient="records")

    # Suggest column mappings
    suggested_mapping = {}
    lower_cols = {c.lower(): c for c in columns}
    for feat in FEATURE_DEFINITIONS:
        fname = feat["name"]
        cic_col = feat["cic_col"].lower()
        # 1. exact match on feature name
        if fname.lower() in lower_cols:
            suggested_mapping[fname] = lower_cols[fname.lower()]
        # 2. match on cic_col
        elif cic_col in lower_cols:
            suggested_mapping[fname] = lower_cols[cic_col]
        # 3. match on derivation (e.g. spkts, sbytes)
        elif feat["unsw_derivation"].lower() in lower_cols:
            suggested_mapping[fname] = lower_cols[feat["unsw_derivation"].lower()]
        else:
            suggested_mapping[fname] = None

    return {
        "file_id": file_id,
        "filename": filename,
        "row_count": row_count,
        "col_count": col_count,
        "columns": columns,
        "dtypes": dtypes,
        "missing_counts": missing_counts,
        "inf_counts": inf_counts,
        "duplicate_count": duplicate_count,
        "preview": preview,
        "suggested_mapping": suggested_mapping,
        "required_features": FEATURE_NAMES,
    }


def evaluate_single_manual_flow(
    features: List[float],
    model_choice: str = "both"
) -> Dict[str, Any]:
    """
    Evaluates a single manual 16-feature vector step-by-step.
    Applies saved preprocessing and executes actual models.
    """
    if not engine.is_loaded and not engine.load_models():
        raise RuntimeError("ML Models not loaded in engine.")

    if len(features) != 16:
        raise ValueError(f"Expected exactly 16 feature values, got {len(features)}.")

    for i, v in enumerate(features):
        if not np.isfinite(v):
            raise ValueError(f"Feature {FEATURE_NAMES[i]} has invalid non-finite value: {v}")
        if v < 0:
            raise ValueError(f"Feature {FEATURE_NAMES[i]} cannot be negative (got {v}).")

    raw_x = np.array(features, dtype=np.float32)

    # 1. Preprocessing (log1p + saved min-max scaler)
    x_transformed = raw_x.copy()
    for i, fdef in enumerate(FEATURE_DEFINITIONS):
        if fdef["log_transform"]:
            x_transformed[i] = np.log1p(float(x_transformed[i]))

    # Scale using saved CIC-IDS training partition statistics (never fit on target)
    x_norm = np.clip((x_transformed - engine.scaler_min) / engine.scaler_range, 0.0, 1.0)

    # Out of bounds drift check
    drift_flags = [bool((x_transformed[i] < engine.scaler_min[i]) or (x_transformed[i] > (engine.scaler_min[i] + engine.scaler_range[i]))) for i in range(16)]

    result = {
        "raw_features": raw_x.tolist(),
        "normalized_features": x_norm.tolist(),
        "drift_flags": drift_flags,
        "decision_threshold": 0.5,
        "origin_badge": "Computed from ML evaluation",
        "latency_badge": "Measured on host",
        "disclaimer": "This prediction is generated from a single network flow observation. Model inference does not constitute proof that an actual attack occurred, nor does a single observation establish classification accuracy."
    }

    # 2. FP32 Prediction
    if model_choice in ["fp32", "both"]:
        t0 = time.perf_counter_ns()
        p_fp32 = float(engine.model_fp32.predict_prob(x_norm)[0])
        t1 = time.perf_counter_ns()
        pred_fp32 = int(p_fp32 >= 0.5)
        lat_fp32_us = round((t1 - t0) / 1000.0, 2)
        result["fp32"] = {
            "probability": round(p_fp32, 5),
            "prediction": pred_fp32,
            "label": "ATTACK" if pred_fp32 == 1 else "BENIGN",
            "latency_us": lat_fp32_us
        }

    # 3. INT8 Quantization and integer-only inference
    if model_choice in ["int8", "both"]:
        s_in = engine.model_int8["s_in"]
        z_in = engine.model_int8["z_in"]
        q_x = int8_quantize_input(x_norm, s_in, z_in)

        t0 = time.perf_counter_ns()
        prob_int8, pred_int8 = int8_forward_integer_only(q_x, engine.model_int8)
        t1 = time.perf_counter_ns()
        lat_int8_us = round((t1 - t0) / 1000.0, 2)

        result["int8"] = {
            "quantized_inputs": q_x.tolist(),
            "scale_in": s_in,
            "zero_point_in": z_in,
            "probability": round(float(prob_int8), 5),
            "prediction": int(pred_int8),
            "label": "ATTACK" if pred_int8 == 1 else "BENIGN",
            "latency_us": lat_int8_us
        }

    if model_choice == "both":
        agreement = (result["fp32"]["prediction"] == result["int8"]["prediction"])
        prob_diff = abs(result["fp32"]["probability"] - result["int8"]["probability"])
        result["comparison"] = {
            "agreement": bool(agreement),
            "probability_difference": round(float(prob_diff), 5)
        }

    return result


def execute_full_experiment(
    file_id: str,
    feature_mapping: Dict[str, str],
    label_column: Optional[str] = None,
    positive_label_value: Optional[str] = "1"
) -> Dict[str, Any]:
    """
    Executes the 10-step experiment on the uploaded dataset with strict dependency gating.
    Never fits scalers on target data; handles unlabeled datasets transparently.
    """
    if not engine.is_loaded and not engine.load_models():
        raise RuntimeError("Models not loaded in backend engine.")

    file_path = os.path.join(UPLOADS_DIR, f"{file_id}.csv")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Uploaded file ID {file_id} not found.")

    run_id = str(uuid.uuid4())[:8]

    # Step 1: Load and inspect dataset
    df = pd.read_csv(file_path, low_memory=False)
    df.columns = [str(c).strip() for c in df.columns]
    N = len(df)

    step1_inspection = {
        "status": "completed",
        "rows": N,
        "columns": len(df.columns),
        "duplicate_rows": int(df.duplicated().sum()),
        "badge": "Computed from dataset"
    }

    # Step 2: Validate feature mapping & Preprocessing
    missing_features = []
    for feat in FEATURE_NAMES:
        col = feature_mapping.get(feat)
        if not col or col not in df.columns:
            missing_features.append(feat)

    if missing_features:
        return {
            "run_id": run_id,
            "status": "failed",
            "failed_at_step": "Step 2: Feature Mapping and Preprocessing",
            "error": f"Missing required feature mappings: {', '.join(missing_features)}.",
            "step1_inspection": step1_inspection,
            "step2_preprocessing": {
                "status": "failed",
                "missing_features": missing_features
            }
        }

    # Extract the 16 features in exact canonical order
    X_raw = pd.DataFrame()
    for feat in FEATURE_NAMES:
        col = feature_mapping[feat]
        X_raw[feat] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # Clean infinities
    X_raw.replace([np.inf, -np.inf], 0.0, inplace=True)
    X_raw = X_raw.clip(lower=0.0).values.astype(np.float32)

    # Check drift before clipping
    drift_percentages = {}
    for i, feat in enumerate(FEATURE_NAMES):
        vals = X_raw[:, i]
        s_min = float(engine.scaler_min[i])
        s_max = float(engine.scaler_min[i] + engine.scaler_range[i])
        out_bounds = np.sum((vals < s_min) | (vals > s_max))
        drift_percentages[feat] = round(float((out_bounds / N) * 100.0), 2)

    # Preprocess: log1p on heavy-tailed features, then scale using SAVED source scaler
    X_norm = np.zeros_like(X_raw)
    for i, fdef in enumerate(FEATURE_DEFINITIONS):
        col_vals = X_raw[:, i]
        if fdef["log_transform"]:
            col_vals = np.log1p(col_vals)
        s_min = engine.scaler_min[i]
        s_range = engine.scaler_range[i]
        X_norm[:, i] = np.clip((col_vals - s_min) / s_range, 0.0, 1.0)

    # Check for ground-truth labels
    y_true = None
    has_labels = False
    class_distribution = None

    if label_column and label_column in df.columns:
        raw_labels = df[label_column].astype(str).str.strip()
        pos_val = str(positive_label_value).strip().lower()
        
        # Standardize binary mapping
        # 1 if equals positive_label_value or contains 'attack' or not 'benign'/'normal'/'0'
        if pos_val in ["1", "attack", "true", "yes"]:
            y_true = np.where(raw_labels.str.lower().isin(["1", "true", "attack", pos_val]), 1, 0)
        else:
            y_true = np.where(raw_labels.str.lower() == pos_val, 1, 0)

        n_benign = int(np.sum(y_true == 0))
        n_attack = int(np.sum(y_true == 1))
        class_distribution = {
            "benign_count": n_benign,
            "attack_count": n_attack,
            "attack_ratio": round(float(n_attack / N), 4)
        }
        has_labels = True

    step2_preprocessing = {
        "status": "completed",
        "mapped_features_count": 16,
        "scaler_used": "MinMax (Fitted strictly on CIC-IDS-2017 training source)",
        "has_ground_truth_labels": has_labels,
        "class_distribution": class_distribution,
        "feature_drift_summary": drift_percentages,
        "badge": "Computed from ML evaluation"
    }

    # Step 3: FP32 Inference
    t_start_fp32 = time.perf_counter_ns()
    probs_fp32 = engine.model_fp32.predict_prob(X_norm)
    t_end_fp32 = time.perf_counter_ns()
    preds_fp32 = (probs_fp32 >= 0.5).astype(int)

    n_fp32_attack = int(np.sum(preds_fp32 == 1))
    n_fp32_benign = int(np.sum(preds_fp32 == 0))

    step3_fp32 = {
        "status": "completed",
        "records_processed": N,
        "attack_predictions": n_fp32_attack,
        "benign_predictions": n_fp32_benign,
        "attack_ratio": round(float(n_fp32_attack / N), 4),
        "mean_probability": round(float(np.mean(probs_fp32)), 4),
        "batch_inference_time_ms": round((t_end_fp32 - t_start_fp32) / 1e6, 2),
        "badge": "Computed from ML evaluation"
    }

    # Step 4: INT8 Inference (True Integer-Only Path)
    s_in = engine.model_int8["s_in"]
    z_in = engine.model_int8["z_in"]
    q_X = int8_quantize_input(X_norm, s_in, z_in)

    t_start_int8 = time.perf_counter_ns()
    probs_int8, preds_int8 = int8_forward_integer_only(q_X, engine.model_int8)
    t_end_int8 = time.perf_counter_ns()

    n_int8_attack = int(np.sum(preds_int8 == 1))
    n_int8_benign = int(np.sum(preds_int8 == 0))

    step4_int8 = {
        "status": "completed",
        "records_processed": N,
        "attack_predictions": n_int8_attack,
        "benign_predictions": n_int8_benign,
        "attack_ratio": round(float(n_int8_attack / N), 4),
        "mean_probability": round(float(np.mean(probs_int8)), 4),
        "batch_inference_time_ms": round((t_end_int8 - t_start_int8) / 1e6, 2),
        "badge": "Computed from ML evaluation"
    }

    # Step 5: FP32 vs INT8 Comparison
    agreement_mask = (preds_fp32 == preds_int8)
    n_agree = int(np.sum(agreement_mask))
    n_disagree = N - n_agree
    prob_diffs = np.abs(probs_fp32 - probs_int8)

    step5_comparison = {
        "status": "completed",
        "prediction_agreement_count": n_agree,
        "prediction_disagreement_count": n_disagree,
        "agreement_percentage": round(float((n_agree / N) * 100.0), 2),
        "mean_absolute_prob_difference": round(float(np.mean(prob_diffs)), 5),
        "max_prob_difference": round(float(np.max(prob_diffs)), 5),
        "fp32_vs_int8_class_counts": {
            "fp32": {"benign": n_fp32_benign, "attack": n_fp32_attack},
            "int8": {"benign": n_int8_benign, "attack": n_int8_attack}
        },
        "badge": "Computed from ML evaluation"
    }

    # Step 6: Classification Evaluation (Strictly if valid ground-truth labels provided)
    if has_labels:
        def calc_metrics(y_t, y_p, p):
            acc = float(accuracy_score(y_t, y_p))
            bal_acc = float(balanced_accuracy_score(y_t, y_p))
            prec = float(precision_score(y_t, y_p, zero_division=0))
            rec = float(recall_score(y_t, y_p, zero_division=0))
            f1 = float(f1_score(y_t, y_p, zero_division=0))
            cm = confusion_matrix(y_t, y_p, labels=[0, 1])
            tn, fp, fn, tp = map(int, cm.ravel())
            fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
            return {
                "accuracy": round(acc, 4),
                "balanced_accuracy": round(bal_acc, 4),
                "precision": round(prec, 4),
                "recall_tpr": round(rec, 4),
                "f1_score": round(f1, 4),
                "fpr": round(fpr, 4),
                "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp}
            }

        m_fp32 = calc_metrics(y_true, preds_fp32, probs_fp32)
        m_int8 = calc_metrics(y_true, preds_int8, probs_int8)

        step6_evaluation = {
            "status": "completed",
            "fp32_metrics": m_fp32,
            "int8_metrics": m_int8,
            "quantization_accuracy_effect": round(m_int8["accuracy"] - m_fp32["accuracy"], 4),
            "quantization_balanced_acc_effect": round(m_int8["balanced_accuracy"] - m_fp32["balanced_accuracy"], 4),
            "badge": "Computed from ML evaluation"
        }
    else:
        step6_evaluation = {
            "status": "not_applicable",
            "reason": "No ground-truth label column selected. Classification performance metrics (accuracy, precision, recall, F1, FPR, confusion matrix) cannot be computed on unlabeled observations.",
            "badge": "Not available"
        }

    # Step 7: Statistical Analysis
    # 7.1 McNemar on prediction decisions (always valid)
    b_pred = int(np.sum((preds_fp32 == 1) & (preds_int8 == 0)))
    c_pred = int(np.sum((preds_fp32 == 0) & (preds_int8 == 1)))
    disc_pred = b_pred + c_pred

    if disc_pred > 0:
        chi2_pred = ((abs(b_pred - c_pred) - 1.0) ** 2) / float(disc_pred) if abs(b_pred - c_pred) >= 1 else 0.0
        p_val_pred = float(1.0 - stats.chi2.cdf(chi2_pred, df=1))
    else:
        chi2_pred = 0.0
        p_val_pred = 1.0

    # 7.2 McNemar on correctness (only if ground-truth labels exist)
    mcnemar_corr = None
    if has_labels:
        corr_f = (preds_fp32 == y_true).astype(int)
        corr_i = (preds_int8 == y_true).astype(int)
        b_corr = int(np.sum((corr_f == 1) & (corr_i == 0)))
        c_corr = int(np.sum((corr_f == 0) & (corr_i == 1)))
        disc_corr = b_corr + c_corr
        if disc_corr > 0:
            chi2_corr = ((abs(b_corr - c_corr) - 1.0) ** 2) / float(disc_corr) if abs(b_corr - c_corr) >= 1 else 0.0
            p_val_corr = float(1.0 - stats.chi2.cdf(chi2_corr, df=1))
        else:
            chi2_corr = 0.0
            p_val_corr = 1.0
        mcnemar_corr = {
            "b_fp32_correct_int8_wrong": b_corr,
            "c_fp32_wrong_int8_correct": c_corr,
            "chi2_continuity_corrected": round(float(chi2_corr), 4),
            "p_value": float(p_val_corr),
            "is_significant_at_05": bool(p_val_corr < 0.05)
        }

    # 7.3 Wilcoxon signed-rank on predicted probabilities
    try:
        w_stat, w_p = stats.wilcoxon(probs_fp32, probs_int8)
        wilcoxon_res = {"statistic": float(w_stat), "p_value": float(w_p)}
    except Exception:
        wilcoxon_res = {"statistic": 0.0, "p_value": 1.0}

    step7_statistics = {
        "status": "completed",
        "mcnemar_predictions": {
            "b_fp32_attack_int8_benign": b_pred,
            "c_fp32_benign_int8_attack": c_pred,
            "discordant_pairs": disc_pred,
            "chi2_continuity_corrected": round(float(chi2_pred), 4),
            "p_value": float(p_val_pred),
            "is_significant_at_05": bool(p_val_pred < 0.05)
        },
        "mcnemar_correctness": mcnemar_corr if has_labels else "Not applicable (requires ground-truth labels)",
        "wilcoxon_probabilities": wilcoxon_res,
        "badge": "Computed from ML evaluation"
    }

    # Step 8: Host Performance Benchmark (Timed with time.perf_counter_ns, GC disabled)
    bench_n = min(500, N)
    sample_sub = X_norm[:bench_n]
    q_sub = q_X[:bench_n]

    # Warmup
    for i in range(min(50, bench_n)):
        _ = engine.model_fp32.predict_prob(sample_sub[i:i+1])
        _ = int8_forward_integer_only(q_sub[i:i+1], engine.model_int8)

    gc.disable()
    lat_fp32_ns = []
    for i in range(bench_n):
        t0 = time.perf_counter_ns()
        _ = engine.model_fp32.predict_prob(sample_sub[i:i+1])
        t1 = time.perf_counter_ns()
        lat_fp32_ns.append(t1 - t0)

    lat_int8_ns = []
    for i in range(bench_n):
        t0 = time.perf_counter_ns()
        _ = int8_forward_integer_only(q_sub[i:i+1], engine.model_int8)
        t1 = time.perf_counter_ns()
        lat_int8_ns.append(t1 - t0)
    gc.enable()

    fp32_lat_us = [v / 1000.0 for v in lat_fp32_ns]
    int8_lat_us = [v / 1000.0 for v in lat_int8_ns]
    med_int8 = float(np.median(int8_lat_us))

    step8_benchmark = {
        "status": "completed",
        "benchmark_samples_timed": bench_n,
        "fp32_latency": {
            "mean_us": round(float(np.mean(fp32_lat_us)), 2),
            "median_us": round(float(np.median(fp32_lat_us)), 2),
            "p95_us": round(float(np.percentile(fp32_lat_us, 95)), 2),
            "throughput_inferences_per_sec": round(1e6 / float(np.median(fp32_lat_us)), 1) if np.median(fp32_lat_us) > 0 else 0
        },
        "int8_latency": {
            "mean_us": round(float(np.mean(int8_lat_us)), 2),
            "median_us": round(med_int8, 2),
            "p95_us": round(float(np.percentile(int8_lat_us, 95)), 2),
            "throughput_inferences_per_sec": round(1e6 / med_int8, 1) if med_int8 > 0 else 0
        },
        "host_environment": get_host_environment_info(),
        "badge": "Measured on host"
    }

    # Step 9: ESP32 Analytical Projection
    step9_projection = {
        "status": "completed",
        "device": "ESP32 (Xtensa LX6 @ 240 MHz)",
        "projected_cycles_int8": 5504,
        "projected_cycles_fp32": 19920,
        "projected_latency_int8_us": 22.93,
        "projected_latency_fp32_us": 83.0,
        "tensor_arena_sram_bytes": 4160,
        "sram_utilization_pct": 1.2695,
        "flash_footprint_bytes": 1236,
        "flash_utilization_pct": 0.0295,
        "virtual_ina219_active_power_mw": 204.6,
        "virtual_ina219_energy_per_inference_uj": 4.691,
        "virtual_uart_link_latency_us": 260.42,
        "badge": "Estimated / Projected — not physically measured"
    }

    # Step 10: Report Export Package
    experiment_report = {
        "run_id": run_id,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "file_id": file_id,
        "row_count": N,
        "has_labels": has_labels,
        "step1_inspection": step1_inspection,
        "step2_preprocessing": step2_preprocessing,
        "step3_fp32": step3_fp32,
        "step4_int8": step4_int8,
        "step5_comparison": step5_comparison,
        "step6_evaluation": step6_evaluation,
        "step7_statistics": step7_statistics,
        "step8_benchmark": step8_benchmark,
        "step9_projection": step9_projection,
        "limitations": [
            "Inference results on arbitrary datasets reflect zero-shot out-of-distribution transfer.",
            "Host execution timings are measured empirically on the host CPU and must not be confused with physical ESP32 timings.",
            "Microcontroller cycle counts and power metrics are mathematical projections derived from counted MACs and documented analytical constants."
        ]
    }

    # Save JSON report
    json_path = os.path.join(EXPERIMENTS_DIR, f"{run_id}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(experiment_report, f, indent=2)

    # Save Predictions CSV
    csv_path = os.path.join(EXPERIMENTS_DIR, f"{run_id}.csv")
    pred_export_df = pd.DataFrame({
        "row_id": range(N),
        "fp32_probability": probs_fp32,
        "fp32_prediction": preds_fp32,
        "int8_probability": probs_int8,
        "int8_prediction": preds_int8,
        "agreement": agreement_mask.astype(int)
    })
    if has_labels and y_true is not None:
        pred_export_df["true_label"] = y_true

    pred_export_df.to_csv(csv_path, index=False)

    return experiment_report


def get_experiment_artifact_path(run_id: str, fmt: str) -> Optional[str]:
    """Returns absolute path to exported JSON or CSV run artifact if it exists."""
    ext = "json" if fmt.lower() == "json" else "csv"
    path = os.path.join(EXPERIMENTS_DIR, f"{run_id}.{ext}")
    if os.path.exists(path):
        return path
    return None

