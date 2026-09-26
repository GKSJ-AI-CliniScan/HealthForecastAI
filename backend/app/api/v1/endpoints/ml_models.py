"""AI model management endpoints - Module 7.

Milestone 2 wires these to the real artifact. Milestone 4 adds the MongoDB
model registry and deployment controls.
"""

import os
import subprocess
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.services import model_service, risk_service

router = APIRouter()

CanManageModels = Annotated[User, Depends(require_permission(Permission.MODEL_MANAGE))]


@router.get("", summary="List registered models")
def list_models(user: CanManageModels) -> list[dict[str, object]]:
    """Return the model registry."""
    info = model_service.model_info()
    return [info] if info.get("loaded") else []


@router.get("/active", summary="The model currently serving predictions")
def active_model(user: CurrentUser) -> dict[str, object]:
    """Return the active model, its version, threshold and test metrics."""
    return model_service.model_info()


@router.get("/compare", summary="Full model comparison and dataset metrics summary")
def compare_models(user: CurrentUser) -> dict[str, object]:
    """Return metrics.json containing Random Forest vs XGBoost comparison & dataset split counts."""
    summary = model_service.load_metrics_summary()
    if summary is None:
        return {
            "available": False,
            "message": "No metrics summary found. Run model training first.",
        }
    return {"available": True, "summary": summary}


@router.get("/metrics", summary="Evaluation metrics for the active model")
def model_metrics(user: CurrentUser) -> dict[str, object]:
    """Return accuracy, precision, recall, F1 and ROC-AUC for the active model."""
    model = model_service.load_model()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No model is loaded. Run: cd ml && python -m src.models.train",
        )

    return {
        "model_name": model.model_name,
        "model_version": model.model_version,
        "decision_threshold": model.decision_threshold,
        "trained_at": model.trained_at,
        "metrics": model.metrics,
    }


@router.get("/drivers", summary="Global feature importance for the active model")
def model_drivers(user: CurrentUser, limit: int = 25) -> list[dict[str, object]]:
    """Return the features the active model weighs most heavily."""
    return risk_service.explain(limit=limit)


@router.post("/reload", summary="Reload the model artifact from disk")
def reload_model(user: CurrentUser) -> dict[str, object]:
    """Drop the cached model and load the artifact again."""
    model_service.reset_cache()
    return model_service.model_info()


def _run_training():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    ml_dir = os.path.join(repo_root, "ml")
    subprocess.run(["py", "-m", "src.models.train"], cwd=ml_dir, check=False)
    model_service.reset_cache()


@router.post("/retrain", summary="Trigger live model training")
def retrain_models(user: CurrentUser, background_tasks: BackgroundTasks) -> dict[str, object]:
    """Trigger background training of Random Forest and XGBoost models."""
    background_tasks.add_task(_run_training)
    return {
        "status": "started",
        "message": "Model training initiated for Random Forest and XGBoost on Diabetes dataset.",
    }
