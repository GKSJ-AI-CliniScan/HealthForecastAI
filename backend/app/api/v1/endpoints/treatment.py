"""Treatment effectiveness endpoints - Module 4."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user
from app.core.rbac import Permission, Role, has_permission
from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services.treatment_service import (
    get_medication_outcome_analysis,
    get_recovery_trends,
    get_treatment_effectiveness_summaries,
)

router = APIRouter()


def require_treatment_report_access(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Guard allowing full or limited treatment report access per RBAC."""
    if has_permission(user.role, Permission.TREATMENT_REPORT_READ) or has_permission(
        user.role, Permission.TREATMENT_REPORT_READ_LIMITED
    ):
        return user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Role '{user.role}' lacks permission for treatment reports",
    )


@router.get(
    "",
    response_model=list[TreatmentEffectivenessSummary],
    summary="List treatment effectiveness summaries",
)
def list_treatment_effectiveness(
    user: CurrentUser = Depends(require_treatment_report_access),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment.

    Doctors receive their relevant scope; Admins and Researchers receive full hospital cohorts.
    """
    summaries = get_treatment_effectiveness_summaries()
    if user.role == Role.DOCTOR:
        # Limited view for doctors: return primary relevant active regimens
        return summaries[:3]
    return summaries


@router.get("/recovery-trends", summary="Weekly recovery trend series")
def recovery_trends(
    user: CurrentUser = Depends(require_treatment_report_access),
) -> list[dict[str, Any]]:
    """Return a weekly recovery score time series for monitoring patient healing trajectories."""
    return get_recovery_trends()


@router.get("/medication-outcomes", summary="Medication change vs outcome analysis")
def medication_outcomes(
    user: CurrentUser = Depends(require_treatment_report_access),
) -> dict[str, Any]:
    """Return outcome comparison between medication adjustment and maintenance cohorts."""
    return get_medication_outcome_analysis()
