"""Treatment effectiveness endpoints - Module 4.

Milestone 3. The access matrix gives a doctor "Limited" treatment reports and
everyone else with access the full ones. "Limited" is implemented as scope: a
doctor sees outcomes computed over their own caseload only, so they can evaluate
the treatments they actually prescribe without seeing hospital-wide results.
Every response is suppressed below a minimum cell size.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_any_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
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


@router.get("/recovery-trends", summary="Recovery across the encounter sequence")
def recovery_trends(
    user: CanReadTreatment, db: DbSession, buckets: int = Query(default=10, ge=4, le=20)
) -> dict[str, object]:
    """Stable-recovery rate across equal-sized cohorts, oldest to newest encounter."""
    trend = performance_service.sequence_trend(db, user, buckets)
    return {
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
