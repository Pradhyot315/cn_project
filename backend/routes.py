"""
FastAPI route definitions for ZeroEdge-NIDS.
"""

import os
import json
import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import FileResponse, JSONResponse

from backend.schemas import (
    PredictRequest, PredictResponse, HealthResponse,
    BenchmarkRunRequest, BenchmarkRunResponse
)
from backend.inference import engine, DATA_DIR
from backend.benchmark import run_live_benchmark
from pipeline.hw_model import get_host_environment_info

router = APIRouter(prefix="/api")

def read_json_artifact(filename: str):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=503, detail=f"Data artifact {filename} not ready. Please run pipeline first.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

@router.get("/health", response_model=HealthResponse)
def get_health():
    host_info = get_host_environment_info()
    models_ready = engine.is_loaded or engine.load_models()
    return {
        "status": "healthy" if models_ready else "pipeline_incomplete",
        "pipeline_ready": models_ready,
        "host_environment": host_info,
        "models_loaded": models_ready
    }

@router.get("/dataset/stats")
def get_dataset_stats():
    return read_json_artifact("dataset_stats.json")

@router.get("/dataset/features")
def get_dataset_features():
    return read_json_artifact("feature_map.json")

@router.get("/dataset/drift")
def get_dataset_drift():
    return read_json_artifact("drift.json")

@router.get("/metrics")
def get_metrics():
    return read_json_artifact("metrics.json")

@router.get("/metrics/per-attack")
def get_metrics_per_attack():
    return read_json_artifact("per_attack.json")

@router.get("/importance")
def get_permutation_importance():
    return read_json_artifact("permutation_importance.json")

@router.get("/seeds")
def get_seed_robustness():
    return read_json_artifact("seeds.json")

@router.get("/stats")
def get_statistical_tests():
    return read_json_artifact("stats.json")

@router.get("/verdict")
def get_verdict():
    return read_json_artifact("verdict.json")

@router.get("/model/summary")
def get_model_summary():
    return read_json_artifact("model_summary.json")

@router.get("/benchmark")
def get_benchmark_results():
    profiling = read_json_artifact("profiling.json")
    return {
        "badge": "Measured on host",
        "measured_benchmark": profiling["measured_benchmark"],
        "esp32_projection": profiling["esp32_projection_int8"],
        "esp32_projection_int8": profiling["esp32_projection_int8"],
        "esp32_projection_fp32": profiling["esp32_projection_fp32"],
        "comparison": profiling["comparison"],
        "host_environment": profiling["host_environment"]
    }

@router.post("/benchmark/run", response_model=BenchmarkRunResponse)
def post_benchmark_run(req: BenchmarkRunRequest):
    try:
        return run_live_benchmark(req.sample_count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict", response_model=PredictResponse)
def post_predict(req: PredictRequest):
    try:
        res = engine.predict_sample(req.features, is_normalized=req.is_normalized)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/samples")
def get_stream_samples(
    n: int = Query(20, ge=1, le=500),
    attack_cat: Optional[str] = None,
    label: Optional[int] = None
):
    samples = read_json_artifact("stream_samples.json")
    filtered = samples
    if attack_cat:
        filtered = [s for s in filtered if s["attack_cat"].lower() == attack_cat.lower()]
    if label is not None:
        filtered = [s for s in filtered if s["true_label"] == label]
    return filtered[:n]

@router.get("/downloads/model_data.h")
def download_model_header():
    path = os.path.join(os.path.dirname(__file__), "downloads", "model_data.h")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="C header file not found.")
    return FileResponse(path, media_type="text/x-c", filename="model_data.h")

@router.websocket("/stream/ws")
async def websocket_stream(websocket: WebSocket):
    """
    Real-time WebSocket telemetry stream.
    Runs real server-side inference, times execution, attaches ESP32 projections,
    and supports client commands (pause, speed, filter).
    """
    await websocket.accept()
    samples = read_json_artifact("stream_samples.json")
    total_samples = len(samples)
    idx = 0
    delay_s = 0.1 # default ~10 flows/sec
    paused = False
    filter_cat = None
    filter_label = None

    try:
        while True:
            # Check for non-blocking client messages/commands
            try:
                cmd_raw = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                cmd = json.loads(cmd_raw)
                action = cmd.get("action")
                if action == "pause":
                    paused = True
                elif action == "resume":
                    paused = False
                elif action == "speed":
                    # Speed multiplier (e.g. 1x -> 100ms, 10x -> 10ms, 100x -> 1ms)
                    speed = max(0.5, float(cmd.get("value", 1.0)))
                    delay_s = max(0.005, 0.1 / speed)
                elif action == "filter":
                    filter_cat = cmd.get("attack_cat")
                    filter_label = cmd.get("label")
                elif action == "reset":
                    idx = 0
            except asyncio.TimeoutError:
                pass # No command received, continue streaming

            if paused:
                await asyncio.sleep(0.05)
                continue

            sample = samples[idx % total_samples]
            idx += 1

            # Check filters
            if filter_cat and sample["attack_cat"].lower() != filter_cat.lower():
                continue
            if filter_label is not None and sample["true_label"] != filter_label:
                continue

            # Run real server-side inference and timing for verification
            pred_info = engine.predict_sample(sample["features_norm"], is_normalized=True)

            payload = {
                "flow_id": sample["flow_id"],
                "true_label": sample["true_label"],
                "attack_cat": sample["attack_cat"],
                "features_norm": sample["features_norm"],
                "features_int8": sample["features_int8"],
                "server_fp32_prob": pred_info["fp32_prob"],
                "server_fp32_pred": pred_info["fp32_pred"],
                "server_fp32_latency_us": pred_info["fp32_latency_us"],
                "server_int8_prob": pred_info["int8_prob"],
                "server_int8_pred": pred_info["int8_pred"],
                "server_int8_latency_us": pred_info["int8_latency_us"],
                "agreement": pred_info["agreement"],
                "telemetry": sample["telemetry"]
            }

            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(delay_s)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
