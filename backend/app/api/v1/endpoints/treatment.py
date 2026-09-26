"""Treatment effectiveness endpoints - Module 4 (Milestone 3)."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, holds_permission, require_any_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.analytics import TreatmentEffectivenessSummary, TreatmentSummary
from app.schemas.common import ApiEnvelope
from app.services import treatment_service

router = APIRouter()

# The access matrix gives doctors a *limited* treatment report and everyone else
# the full one. "Limited" is the same aggregation narrowed to the doctor's own
# caseload rather than a separate endpoint, so both permissions are admitted here
# and treatment_scope decides how wide the query is.
CanReadTreatment = Annotated[
    User,
    Depends(
        require_any_permission(
            Permission.TREATMENT_REPORT_READ, Permission.TREATMENT_REPORT_READ_LIMITED
        )
    ),
]

DiseaseGroup = Annotated[
    str | None,
    Query(
        description=(
            "Restrict the rollup to one diagnostic group. Omit or 'All' for hospital-wide."
        ),
        examples=["DIABETES"],
    ),
]


def treatment_scope(user: User) -> int | None:
    """Return the doctor id to narrow the query to, or None for hospital-wide."""
    if holds_permission(user, Permission.TREATMENT_REPORT_READ):
        return None
    return user.id


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness(
    user: CanReadTreatment,
    db: Session = Depends(get_db),
    disease_group: DiseaseGroup = None,
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment regimen."""
    return treatment_service.get_treatment_effectiveness_summary(
        db, disease_group, treatment_scope(user)
    )


@router.get("/summary", response_model=ApiEnvelope[TreatmentSummary])
def treatment_summary(
    user: CanReadTreatment,
    db: Session = Depends(get_db),
    disease_group: DiseaseGroup = None,
) -> ApiEnvelope[TreatmentSummary]:
    """Composite payload for the treatment effectiveness dashboard.

    Carries the headline rates, the per-protocol efficacy vs complication
    matrix, and the recovery trajectory by specialty cohort.
    """
    return ApiEnvelope.ok(
        treatment_service.get_treatment_summary(db, disease_group, treatment_scope(user))
    )


@router.get("/medications", response_model=ApiEnvelope[list[Any]])
def medication_outcomes(
    user: CanReadTreatment,
    db: Session = Depends(get_db),
    disease_group: DiseaseGroup = None,
) -> ApiEnvelope[list[Any]]:
    """Drug regimen outcome analysis: clinical success against complication rate."""
    outcomes = treatment_service.get_medication_outcomes(db, disease_group, treatment_scope(user))
    return ApiEnvelope.ok([outcome.model_dump(by_alias=True) for outcome in outcomes])


@router.get("/recovery-trends", response_model=ApiEnvelope[list[Any]])
def recovery_trends(
    user: CanReadTreatment,
    db: Session = Depends(get_db),
    disease_group: DiseaseGroup = None,
) -> ApiEnvelope[list[Any]]:
    """Recovery index by day of stay, split across specialty cohorts."""
    return ApiEnvelope.ok(
        treatment_service.get_recovery_trends(db, disease_group, treatment_scope(user))
    )
