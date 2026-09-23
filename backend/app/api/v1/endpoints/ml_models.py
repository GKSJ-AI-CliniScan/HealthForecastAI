"""AI model management endpoints - Module 7 (System Administrator only).

Reads the model_metadata registry directly (Phase A/backend/app/models/
model_metadata.py) - PostgreSQL is this project's sole operational database,
so there is no MongoDB collection to read here.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.repositories.model_metadata_repository import ModelMetadataRepository
from app.schemas.model_metadata import ModelMetadataRead
from app.services.risk_service import READMISSION_MODEL_NAME, RISK_MODEL_NAME

router = APIRouter()

_manage_models = require_permission(Permission.MODEL_MANAGE)
_TRACKED_MODEL_NAMES = (RISK_MODEL_NAME, READMISSION_MODEL_NAME)


@router.get(
    "", response_model=list[ModelMetadataRead], summary="List registered models"
)
def list_models(
    user: CurrentUser = Depends(_manage_models), db: Session = Depends(get_db)
) -> list[ModelMetadataRead]:
    """Return every registered model version, newest first."""
    records = ModelMetadataRepository(db).list_all()
    return [ModelMetadataRead.model_validate(record) for record in records]


@router.get(
    "/active",
    response_model=list[ModelMetadataRead],
    summary="Return the models currently serving predictions",
)
def active_models(
    user: CurrentUser = Depends(_manage_models), db: Session = Depends(get_db)
) -> list[ModelMetadataRead]:
    """Return the production version of each tracked model family, if registered."""
    repo = ModelMetadataRepository(db)
    records = [repo.get_production(name) for name in _TRACKED_MODEL_NAMES]
    return [
        ModelMetadataRead.model_validate(record)
        for record in records
        if record is not None
    ]


@router.get(
    "/metrics",
    response_model=dict[str, ModelMetadataRead],
    summary="Evaluation metrics for the active models",
)
def model_metrics(
    user: CurrentUser = Depends(_manage_models), db: Session = Depends(get_db)
) -> dict[str, ModelMetadataRead]:
    """Return accuracy/precision/recall/F1/ROC-AUC for each active model family."""
    repo = ModelMetadataRepository(db)
    result: dict[str, ModelMetadataRead] = {}
    for name in _TRACKED_MODEL_NAMES:
        record = repo.get_production(name)
        if record is not None:
            result[name] = ModelMetadataRead.model_validate(record)
    return result
