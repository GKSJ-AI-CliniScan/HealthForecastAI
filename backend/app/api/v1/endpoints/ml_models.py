"""AI model management endpoints - Module 7."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.services import model_service

router = APIRouter()


@router.get("", summary="List registered models")
def list_models(
    user: CurrentUser = Depends(require_permission(Permission.MODEL_MANAGE)),
) -> list[dict]:
    return model_service.list_registered_models()


@router.get("/active", summary="Return the model currently serving predictions")
def active_model(
    user: CurrentUser = Depends(require_permission(Permission.MODEL_MANAGE)),
) -> dict:
    return model_service.get_active_model_info()


@router.get("/metrics", summary="Evaluation metrics for the active model")
def model_metrics(
    user: CurrentUser = Depends(require_permission(Permission.MODEL_MANAGE)),
) -> dict:
    return model_service.get_active_model_metrics()
