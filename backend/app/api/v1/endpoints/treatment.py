"""Treatment effectiveness endpoints - Module 4.

Milestone 3. The access matrix gives a doctor "Limited" treatment reports and
everyone else with access the full ones. "Limited" is implemented as scope: a
doctor sees outcomes computed over their own caseload only, so they can evaluate
the treatments they actually prescribe without seeing hospital-wide results.
Every response is suppressed below a minimum cell size.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, holds_permission, require_any_permission
from app.core.rbac import Permission
from app.models.user import User
from app.schemas.analytics import TreatmentEffectivenessSummary, TreatmentSummary
from app.schemas.common import ApiEnvelope
from app.schemas.treatment import (
    CareProcessReport,
    MedicationDetail,
    MedicationReport,
    RecoveryReport,
)
from app.services import auth_service, performance_service, treatment_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]

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


@router.get("", response_model=MedicationReport, summary="Medication outcomes")
def medication_outcomes(
    user: CanReadTreatment,
    db: DbSession,
    diagnosis: str | None = Query(
        default=None, max_length=64, description="Restrict to one primary diagnosis group"
    ),
) -> MedicationReport:
    """Readmission outcomes for every drug, crude and adjusted.

    Each drug is compared with admissions not on it, both crudely and after
    stratifying on age, prior admissions and diagnosis. Where the two disagree,
    the response flags it: that is confounding by indication.
    """
    auth_service.audit_read(db, user, "treatment.report", f"diagnosis:{diagnosis or 'all'}")
    return MedicationReport(**treatment_service.medication_report(db, user, diagnosis))


@router.get(
    "/effectiveness",
    response_model=list[TreatmentEffectivenessSummary],
    summary="Treatment effectiveness summary",
)
def list_treatment_effectiveness(
    user: CanReadTreatment,
    db: DbSession,
    disease_group: DiseaseGroup = None,
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment regimen."""
    return treatment_service.get_treatment_effectiveness_summary(
        db, disease_group, treatment_scope(user)
    )


@router.get(
    "/summary",
    response_model=ApiEnvelope[TreatmentSummary],
    summary="Treatment dashboard summary",
)
def treatment_summary(
    user: CanReadTreatment,
    db: DbSession,
    disease_group: DiseaseGroup = None,
) -> ApiEnvelope[TreatmentSummary]:
    """Composite payload for the treatment effectiveness dashboard.

    Carries the headline rates, the per-protocol efficacy vs complication
    matrix, and the recovery trajectory by specialty cohort.
    """
    return ApiEnvelope.ok(
        treatment_service.get_treatment_summary(db, disease_group, treatment_scope(user))
    )


@router.get(
    "/medications",
    response_model=ApiEnvelope[list[Any]],
    summary="Drug regimen outcome analysis",
)
def list_medication_outcomes(
    user: CanReadTreatment,
    db: DbSession,
    disease_group: DiseaseGroup = None,
) -> ApiEnvelope[list[Any]]:
    """Drug regimen outcome analysis: clinical success against complication rate."""
    outcomes = treatment_service.get_medication_outcomes(db, disease_group, treatment_scope(user))
    return ApiEnvelope.ok([outcome.model_dump(by_alias=True) for outcome in outcomes])


@router.get(
    "/medications/{name}", response_model=MedicationDetail, summary="One medication in depth"
)
def medication_detail(name: str, user: CanReadTreatment, db: DbSession) -> MedicationDetail:
    """One drug's overall effect, plus what raising or lowering the dose did."""
    detail = treatment_service.medication_detail(db, user, name)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No admissions on '{name}' in the records you can see",
        )
    return MedicationDetail(**detail)


@router.get(
    "/care-processes", response_model=CareProcessReport, summary="HbA1c testing and regimen change"
)
def care_processes(user: CanReadTreatment, db: DbSession) -> CareProcessReport:
    """The effect of testing HbA1c, and of changing the regimen, on readmission."""
    return CareProcessReport(**treatment_service.care_process_report(db, user))


@router.get("/recovery", response_model=RecoveryReport, summary="Recovery outcomes")
def recovery(user: CanReadTreatment, db: DbSession) -> RecoveryReport:
    """Recovery outcomes overall and by age, diagnosis and treatment.

    Recovery is a documented proxy - no readmission within 30 days and discharged
    home - because the source data holds no clinical recovery score.
    """
    return RecoveryReport(**treatment_service.recovery_report(db, user))


@router.get(
    "/recovery-trends",
    summary="Recovery trends across time / specialty",
)
def recovery_trends(
    user: CanReadTreatment,
    db: DbSession,
    buckets: int = Query(default=10, ge=4, le=20),
    disease_group: DiseaseGroup = None,
) -> dict[str, object]:
    """Recovery trends across sequence cohorts and specialty cohorts."""
    trend = performance_service.sequence_trend(db, user, buckets)
    m3_trends = treatment_service.get_recovery_trends(db, disease_group, treatment_scope(user))
    return {
        "success": True,
        "data": [
            p.model_dump(by_alias=True) if hasattr(p, "model_dump") else p for p in m3_trends
        ],
        "scope": trend["scope"],
        "axis": trend["axis"],
        "axis_note": trend["axis_note"],
        "points": [
            {
                "cohort": p["cohort"],
                "n": p["n"],
                "stable_recovery_rate": p["stable_recovery_rate"],
                "average_length_of_stay": p["average_length_of_stay"],
            }
            for p in trend["points"]
        ],
    }
