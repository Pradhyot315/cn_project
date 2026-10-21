"""
Inference engine for FastAPI backend.
Performs real FP32 and integer-only INT8 forward passes with host timing.
"""

import os
import json
import time
import numpy as np
from pipeline.train import FP32MLP
from pipeline.quantize import int8_quantize_input, int8_forward_integer_only
from pipeline.feature_map import FEATURE_DEFINITIONS

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

class InferenceEngine:
    def __init__(self):
        self.model_fp32 = None
        self.model_int8 = None
        self.summary = None
        self.scaler_min = None
        self.scaler_range = None
        self.is_loaded = False
        self.load_models()

    def load_models(self):
        fp32_path = os.path.join(DATA_DIR, "model_fp32.json")
        int8_path = os.path.join(DATA_DIR, "model_int8.json")
        summary_path = os.path.join(DATA_DIR, "model_summary.json")

        if os.path.exists(fp32_path) and os.path.exists(int8_path) and os.path.exists(summary_path):
            with open(fp32_path, "r", encoding="utf-8") as f:
                self.model_fp32 = FP32MLP.from_dict(json.load(f))
            with open(int8_path, "r", encoding="utf-8") as f:
                self.model_int8 = json.load(f)
            with open(summary_path, "r", encoding="utf-8") as f:
                self.summary = json.load(f)
                self.scaler_min = np.array(self.summary["scaler_min"], dtype=np.float32)
                self.scaler_range = np.array(self.summary["scaler_range"], dtype=np.float32)
            self.is_loaded = True
            return True
        return False

    def normalize_raw_features(self, raw_features):
        x = np.array(raw_features, dtype=np.float32)
        # Apply log1p where specified in feature definitions
        for i, feat in enumerate(FEATURE_DEFINITIONS):
            if feat["log_transform"]:
                x[i] = np.log1p(max(0.0, float(x[i])))
        # Scale and clip to [0, 1]
        x_norm = np.clip((x - self.scaler_min) / self.scaler_range, 0.0, 1.0)
        return x_norm

    def predict_sample(self, features, is_normalized=False):
        if not self.is_loaded and not self.load_models():
            raise RuntimeError("Models not yet available. Please run the pipeline first.")

        if is_normalized:
            x_norm = np.clip(np.array(features, dtype=np.float32), 0.0, 1.0)
        else:
            x_norm = self.normalize_raw_features(features)

        # 1. FP32 inference + timing
        t0 = time.perf_counter_ns()
        prob_fp32 = float(self.model_fp32.predict_prob(x_norm)[0])
        t1 = time.perf_counter_ns()
        lat_fp32_us = round((t1 - t0) / 1000.0, 2)
        pred_fp32 = int(prob_fp32 >= 0.5)

        # 2. INT8 quantization + integer-only inference + timing
        s_in = self.model_int8["s_in"]
        z_in = self.model_int8["z_in"]
        q_in = int8_quantize_input(x_norm, s_in, z_in)

        t2 = time.perf_counter_ns()
        prob_int8, pred_int8 = int8_forward_integer_only(q_in, self.model_int8)
        t3 = time.perf_counter_ns()
        lat_int8_us = round((t3 - t2) / 1000.0, 2)

        return {
            "fp32_prob": round(prob_fp32, 4),
            "fp32_pred": pred_fp32,
            "fp32_label": "ATTACK" if pred_fp32 == 1 else "BENIGN",
            "fp32_latency_us": lat_fp32_us,
            "int8_prob": round(float(prob_int8), 4),
            "int8_pred": int(pred_int8),
            "int8_label": "ATTACK" if pred_int8 == 1 else "BENIGN",
            "int8_latency_us": lat_int8_us,
            "quantized_input": q_in.tolist(),
            "normalized_features": [round(float(v), 5) for v in x_norm],
            "agreement": bool(pred_fp32 == pred_int8),
            "badge_latency": "Measured on host"
        }

engine = InferenceEngine()
