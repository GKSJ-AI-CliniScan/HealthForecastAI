"""AI model management endpoints - Module 7 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.services import model_service

router = APIRouter()

_manage_models = require_permission(Permission.MODEL_MANAGE)


@router.get("", summary="List registered models")
def list_models(user: CurrentUser = Depends(_manage_models)) -> list[dict[str, str]]:
    """Return the model registry.

    TODO(milestone-4): read the registry from MongoDB (collection: model_runs).
    """
    return []


@router.get("/active", summary="Return the model currently serving predictions")
def active_model(user: CurrentUser = Depends(_manage_models)) -> dict[str, str]:
    """Return the active model name and artefact directory."""
    return {
        "name": settings.ACTIVE_RISK_MODEL,
        "artifact_dir": settings.MODEL_ARTIFACT_DIR,
        "status": "not-loaded",
    }


@router.get("/metrics", summary="Evaluation metrics for the active model")
def model_metrics(user: CurrentUser = Depends(_manage_models)) -> dict[str, float]:
    """Return accuracy, precision, recall, F1 and ROC-AUC for the best trained model.

    A missing or unreadable metrics.json is a 503, never a 200 with nulls
    (C3): a null accuracy is indistinguishable from a real zero, and a
    system administrator reading this needs to know which one it is.
    """
    try:
        return model_service.read_best_model_metrics()
    except model_service.ModelUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
