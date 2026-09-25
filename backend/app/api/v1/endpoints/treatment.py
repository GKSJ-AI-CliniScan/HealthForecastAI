"""Treatment effectiveness endpoints - Module 4."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import OutcomeProfile, TreatmentEffectivenessSummary
from app.services.outcome_service import get_outcome_profile
from app.services.treatment_service import get_treatment_effectiveness
from app.schemas.analytics import OutcomeProfile, TreatmentEffectivenessSummary
from app.services.outcome_service import get_outcome_profile
router = APIRouter()


@router.get(
    "",
    response_model=list[TreatmentEffectivenessSummary],
)
def list_treatment_effectiveness(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_permission(Permission.TREATMENT_REPORT_READ)
    ),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment."""

    return get_treatment_effectiveness(db)


@router.get(
    "/recovery-trends",
    summary="Recovery trend series",
)
def recovery_trends(
    user: CurrentUser = Depends(
        require_permission(Permission.TREATMENT_REPORT_READ)
    ),
) -> list[dict[str, float]]:
    """Return a recovery score time series.

    Recovery trend calculation is not implemented yet because
    the project does not define how recovery_score is generated.
    """

    return []

@router.get(
    "/outcomes",
    response_model=list[OutcomeProfile],
    summary="Patient recovery and outcome profiles",
)
def patient_outcomes(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_permission(Permission.TREATMENT_REPORT_READ)
    ),
) -> list[OutcomeProfile]:
    """Return observed patient profiles grouped by readmission outcome."""

    return get_outcome_profile(db)