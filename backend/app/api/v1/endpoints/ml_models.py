"""AI model management endpoints - Module 7 (System Administrator only)."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.services import model_service

router = APIRouter()

_manage_models = require_permission(Permission.MODEL_MANAGE)


@router.get("", summary="List registered models")
def list_models(user: CurrentUser = Depends(_manage_models)) -> list[dict[str, str]]:
    """Return the models this deployment knows about."""
    active = model_service.active_model_info()
    return [
        {**active, "role": "active", "description": "Serves /risk/predict"},
        {
            "name": "readmission_random_forest",
            "version": "ml-pipeline",
            "role": "offline evaluation",
            "description": "Random Forest trained and evaluated in ml/src/models/train_model.py",
        },
    ]


@router.get("/active", summary="Return the model currently serving predictions")
def active_model(user: CurrentUser = Depends(_manage_models)) -> dict[str, str]:
    """Return the active model name, version and status."""
    return model_service.active_model_info()


@router.get("/metrics", summary="Evaluation metrics for the offline Random Forest")
def model_metrics(user: CurrentUser = Depends(_manage_models)) -> dict[str, float | None]:
    """Return accuracy, precision, recall, F1 and ROC-AUC from the ML pipeline evaluation.

    These are the held-out scores of the Random Forest in ml/src, not of the
    baseline model that serves requests when no artefact is installed.
    """
    return dict(model_service.REFERENCE_METRICS)
