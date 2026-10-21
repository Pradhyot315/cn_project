"""
Pydantic schemas for the ZeroEdge-NIDS FastAPI backend.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    features: List[float] = Field(..., min_length=16, max_length=16, description="List of 16 network flow features")
    is_normalized: bool = Field(False, description="True if features are already normalized into [0, 1]")

class PredictResponse(BaseModel):
    fp32_prob: float
    fp32_pred: int
    fp32_label: str
    fp32_latency_us: float
    
    int8_prob: float
    int8_pred: int
    int8_label: str
    int8_latency_us: float
    
    quantized_input: List[int]
    normalized_features: List[float]
    agreement: bool
    badge_latency: str = "Measured on host"

class HealthResponse(BaseModel):
    status: str
    pipeline_ready: bool
    host_environment: Dict[str, Any]
    models_loaded: bool

class BenchmarkRunRequest(BaseModel):
    sample_count: int = Field(500, ge=50, le=2000, description="Number of stream samples to benchmark")

class BenchmarkRunResponse(BaseModel):
    badge: str = "Measured on host"
    sample_count: int
    fp32_median_us: float
    fp32_p95_us: float
    int8_median_us: float
    int8_p95_us: float
    throughput_int8: float
    speedup_ratio: float
