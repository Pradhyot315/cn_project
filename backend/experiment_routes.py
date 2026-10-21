"""
FastAPI router for Interactive Experiment Lab endpoints.
Includes dataset inspection, run execution, manual flow testing, presets, and report exports.
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.experiment_service import (
    inspect_uploaded_csv,
    execute_full_experiment,
    evaluate_single_manual_flow,
    get_genuine_preset_flows,
    get_experiment_artifact_path
)

experiment_router = APIRouter(prefix="/api/experiment", tags=["Experiment Lab"])


class ExperimentRunRequest(BaseModel):
    file_id: str
    feature_mapping: Dict[str, str]
    label_column: Optional[str] = None
    positive_label_value: Optional[str] = "1"


class ManualFlowRequest(BaseModel):
    features: List[float] = Field(..., min_length=16, max_length=16, description="16 raw or normalized flow features")
    model_choice: str = Field("both", description="Model choice: 'both', 'fp32', or 'int8'")


@experiment_router.post("/inspect-dataset")
async def inspect_dataset(file: UploadFile = File(...)):
    """Uploads and safely inspects a CSV file without modifying or training on data."""
    if not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Uploaded file must be a CSV file (.csv).")

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds maximum permitted 50MB limit.")

        inspection = inspect_uploaded_csv(content, file.filename)
        return inspection
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset inspection error: {str(e)}")


@experiment_router.post("/run")
def run_experiment(req: ExperimentRunRequest):
    """Executes the full 10-step experiment workflow on the uploaded dataset with strict gating."""
    try:
        results = execute_full_experiment(
            file_id=req.file_id,
            feature_mapping=req.feature_mapping,
            label_column=req.label_column,
            positive_label_value=req.positive_label_value
        )
        return results
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Experiment execution failed: {str(e)}")


@experiment_router.post("/manual-flow")
def manual_flow(req: ManualFlowRequest):
    """Evaluates a single manual 16-feature vector with step-by-step intermediate output breakdown."""
    try:
        result = evaluate_single_manual_flow(
            features=req.features,
            model_choice=req.model_choice
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual flow evaluation error: {str(e)}")


@experiment_router.get("/preset-flows")
def get_presets():
    """Returns genuine benign and attack flow vectors from verified test dataset."""
    try:
        return get_genuine_preset_flows()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load preset flows: {str(e)}")


@experiment_router.get("/export/{run_id}/json")
def export_json(run_id: str):
    """Downloads the full structured experiment audit package in JSON format."""
    path = get_experiment_artifact_path(run_id, "json")
    if not path:
        raise HTTPException(status_code=404, detail=f"Experiment run report {run_id}.json not found.")
    return FileResponse(path, media_type="application/json", filename=f"experiment_{run_id}.json")


@experiment_router.get("/export/{run_id}/csv")
def export_csv(run_id: str):
    """Downloads the flow-by-flow prediction results in CSV format."""
    path = get_experiment_artifact_path(run_id, "csv")
    if not path:
        raise HTTPException(status_code=404, detail=f"Experiment predictions {run_id}.csv not found.")
    return FileResponse(path, media_type="text/csv", filename=f"experiment_{run_id}_predictions.csv")
