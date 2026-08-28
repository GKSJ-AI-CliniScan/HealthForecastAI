"""AI model management endpoints - Module 7 (System Administrator only)."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission

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
def model_metrics(
    user: CurrentUser = Depends(_manage_models),
) -> dict[str, float | None]:
    """Return accuracy, precision, recall, F1 and ROC-AUC for the active model.

    TODO(milestone-2): populate from ml/src/evaluation/metrics.py output.
    """
    return {
        "accuracy": None,
        "precision": None,
        "recall": None,
        "f1": None,
        "roc_auc": None,
    }
