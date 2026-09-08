"""Treatment effectiveness endpoints - Module 4 (Milestone 3)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.analytics import TreatmentEffectivenessSummary

router = APIRouter()

CanReadTreatment = Annotated[User, Depends(require_permission(Permission.TREATMENT_REPORT_READ))]


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(user: CanReadTreatment) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment.

    TODO(milestone-3): aggregate treatment_outcomes and compare cohorts.
    """
    return []


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(user: CanReadTreatment) -> list[dict[str, float]]:
    """Return a recovery score time series.

    TODO(milestone-3): compute weekly recovery trends from treatment_outcomes.
    """
    return []
