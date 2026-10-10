"""Treatment effectiveness endpoints - Module 4."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user
from app.core.rbac import Permission, has_permission
from app.db.session import get_db
from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services import treatment_service

router = APIRouter()


def require_treatment_access(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Allow roles with either full or limited treatment read permissions."""
    if not (
        has_permission(user.role, Permission.TREATMENT_REPORT_READ)
        or has_permission(user.role, Permission.TREATMENT_REPORT_READ_LIMITED)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: insufficient treatment permissions",
        )
    return user


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_treatment_access),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment."""
    return treatment_service.get_treatment_effectiveness(db)


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_treatment_access),
) -> list[dict[str, Any]]:
    """Return recovery scores and length of stay trends across treatments."""
    return treatment_service.get_recovery_trends(db)
