"""AI model management endpoints - Module 7.

Milestone 2 wires these to the real artifact. Milestone 4 adds the MongoDB
model registry and deployment controls.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.services import model_service, risk_service

router = APIRouter()

CanManageModels = Annotated[User, Depends(require_permission(Permission.MODEL_MANAGE))]


@router.get("", summary="List registered models")
def list_models(user: CanManageModels) -> list[dict[str, object]]:
    """Return the model registry.

    Milestone 2 serves a single promoted artifact, so the registry has at most
    one entry.

    TODO(milestone-4): read the full run history from MongoDB (model_runs) so
    superseded versions stay visible and a rollback is possible.
    """
    info = model_service.model_info()
    return [info] if info.get("loaded") else []


@router.get("/active", summary="The model currently serving predictions")
def active_model(user: CanManageModels) -> dict[str, object]:
    """Return the active model, its version, threshold and test metrics."""
    return model_service.model_info()


@router.get("/metrics", summary="Evaluation metrics for the active model")
def model_metrics(user: CanManageModels) -> dict[str, object]:
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
def model_drivers(user: CanManageModels, limit: int = 25) -> list[dict[str, object]]:
    """Return the features the active model weighs most heavily."""
    return risk_service.explain(limit=limit)


@router.post("/reload", summary="Reload the model artifact from disk")
def reload_model(user: CanManageModels) -> dict[str, object]:
    """Drop the cached model and load the artifact again.

    Lets a freshly trained model be picked up without restarting the API.
    """
    model_service.reset_cache()
    return model_service.model_info()
