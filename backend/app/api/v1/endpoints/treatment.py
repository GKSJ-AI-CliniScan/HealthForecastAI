"""Treatment effectiveness endpoints - Module 4."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services import treatment_service

router = APIRouter()


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment, best recovery first."""
    return treatment_service.treatment_summaries()


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[dict[str, float]]:
    """Return the average recovery score per month."""
    return treatment_service.recovery_trend()
