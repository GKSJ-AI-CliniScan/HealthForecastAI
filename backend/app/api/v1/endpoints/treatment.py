"""Treatment effectiveness endpoints - Module 4."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.analytics import TreatmentEffectivenessSummary

router = APIRouter()


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment.

    TODO(milestone-3): aggregate treatment_outcomes and compare cohorts.
    """
    return []


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[dict[str, float]]:
    """Return a recovery score time series.

    TODO(milestone-3): compute weekly recovery trends from treatment_outcomes.
    """
    return []
