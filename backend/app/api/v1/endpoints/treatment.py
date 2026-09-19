"""Treatment effectiveness endpoints - Module 4 (Milestone 3)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services import treatment_service

router = APIRouter()

CanReadTreatment = Annotated[User, Depends(require_permission(Permission.TREATMENT_REPORT_READ))]


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(
    user: CanReadTreatment, db: Session = Depends(get_db)
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment regimen."""
    return treatment_service.get_treatment_effectiveness_summary(db)


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(
    user: CanReadTreatment, db: Session = Depends(get_db)
) -> list[dict[str, object]]:
    """Return a recovery score time series."""
    return treatment_service.get_recovery_trends(db)


