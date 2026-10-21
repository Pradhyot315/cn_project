"""
Dynamic benchmark runner for the FastAPI backend.
"""

import os
import json
import time
import gc
import numpy as np
from backend.inference import engine, DATA_DIR

def run_live_benchmark(sample_count=500):
    if not engine.is_loaded and not engine.load_models():
        raise RuntimeError("Models not loaded.")

    samples_path = os.path.join(DATA_DIR, "stream_samples.json")
    if not os.path.exists(samples_path):
        raise RuntimeError("Stream samples not found. Run the pipeline first.")

    with open(samples_path, "r", encoding="utf-8") as f:
        all_samples = json.load(f)

    samples = all_samples[:min(sample_count, len(all_samples))]
    n = len(samples)

    fp32_times = []
    int8_times = []

    # Warmup
    for s in samples[:50]:
        _ = engine.model_fp32.predict_prob(s["features_norm"])
        _ = engine.predict_sample(s["features_norm"], is_normalized=True)

    gc.disable()
    for s in samples:
        t0 = time.perf_counter_ns()
        _ = engine.model_fp32.predict_prob(s["features_norm"])
        t1 = time.perf_counter_ns()
        fp32_times.append((t1 - t0) / 1000.0)

    for s in samples:
        q = np.array(s["features_int8"], dtype=np.int8)
        t0 = time.perf_counter_ns()
        _ = engine.predict_sample(s["features_norm"], is_normalized=True)
        t1 = time.perf_counter_ns()
        int8_times.append((t1 - t0) / 1000.0)
    gc.enable()

    fp32_med = float(np.median(fp32_times))
    int8_med = float(np.median(int8_times))

    return {
        "badge": "Measured on host",
        "sample_count": n,
        "fp32_median_us": round(fp32_med, 2),
        "fp32_p95_us": round(float(np.percentile(fp32_times, 95)), 2),
        "int8_median_us": round(int8_med, 2),
        "int8_p95_us": round(float(np.percentile(int8_times, 95)), 2),
        "throughput_int8": round(1e6 / int8_med, 1) if int8_med > 0 else 0,
        "speedup_ratio": round(fp32_med / int8_med, 2) if int8_med > 0 else 1.0
    }
