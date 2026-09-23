"""Treatment effectiveness endpoints - Module 4."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services import treatment_service

router = APIRouter()


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment."""
    return treatment_service.get_treatment_effectiveness(db)


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[dict[str, Any]]:
    """Return recovery scores and length of stay trends across treatments."""
    return treatment_service.get_recovery_trends(db)
