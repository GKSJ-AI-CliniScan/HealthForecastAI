"""AI model management endpoints - Module 7 (System Administrator only)."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.services import model_service

router = APIRouter()

_manage_models = require_permission(Permission.MODEL_MANAGE)


@router.get("", summary="List registered models")
def list_models(user: CurrentUser = Depends(_manage_models)) -> list[dict[str, str]]:
    """Return the model registry."""
    return []


@router.get("/active", summary="Return the model currently serving predictions")
def active_model(user: CurrentUser = Depends(_manage_models)) -> dict[str, str]:
    """Return the active model name and artefact directory."""
    return {
        "name": settings.ACTIVE_RISK_MODEL,
        "artifact_dir": settings.MODEL_ARTIFACT_DIR,
        "status": "ready",
    }


@router.get("/metrics", summary="Evaluation metrics for the active model")
def model_metrics(user: CurrentUser = Depends(_manage_models)) -> dict[str, float | None]:
    """Return accuracy, precision, recall, F1 and ROC-AUC for the active model."""
    metrics_data = model_service.get_metrics_data()
    
    # Check if metrics exist
    results = metrics_data.get("results", {})
    best_model_name = metrics_data.get("best_model", "xgboost")
    active_results = results.get(best_model_name, {})

    return {
        "accuracy": active_results.get("accuracy"),
        "precision": active_results.get("precision"),
        "recall": active_results.get("recall"),
        "f1": active_results.get("f1"),
        "roc_auc": active_results.get("roc_auc"),
    }