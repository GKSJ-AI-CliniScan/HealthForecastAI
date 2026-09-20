"""Treatment effectiveness endpoints - Module 4."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import (
    MedicationOutcomeSummary,
    RecoveryTrend,
    TreatmentEffectivenessSummary,
)
from app.schemas.treatment import (
    TreatmentOutcomeCreate,
    TreatmentOutcomeRead,
)
from app.services.treatment_outcome_service import (
    create_treatment_outcome,
)
from app.services.treatment_service import (
    get_treatment_recovery_trends,
    list_medication_outcomes,
    list_treatment_effectiveness,
)

router = APIRouter()


@router.get(
    "",
    response_model=list[TreatmentEffectivenessSummary],
    summary="Treatment effectiveness report",
)
def list_treatment_effectiveness_endpoint(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment."""

    return list_treatment_effectiveness(db)


@router.get(
    "/recovery-trends",
    response_model=list[RecoveryTrend],
    summary="Recovery trend series",
)
def recovery_trends(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[RecoveryTrend]:
    """Return weekly recovery score trends."""

    return get_treatment_recovery_trends(db)


@router.post(
    "/outcomes",
    response_model=TreatmentOutcomeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record a treatment outcome",
)
def create_treatment_outcome_endpoint(
    payload: TreatmentOutcomeCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> TreatmentOutcomeRead:
    """Record the outcome of a treatment for an admission."""

    try:
        outcome = create_treatment_outcome(
            db,
            payload,
        )

        return TreatmentOutcomeRead.model_validate(outcome)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/medication-outcomes",
    response_model=list[MedicationOutcomeSummary],
    summary="Medication outcome analysis",
)
def medication_outcomes(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[MedicationOutcomeSummary]:
    """Return outcomes grouped by medication change."""

    return list_medication_outcomes(db)
