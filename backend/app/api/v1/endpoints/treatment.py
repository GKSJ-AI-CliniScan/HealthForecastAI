"""Treatment effectiveness endpoints - Module 4."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user
from app.core.rbac import Permission, has_permission
from app.db.session import get_db
from app.schemas.treatment import (
    ReadmissionReduction,
    RecoveryTrendPoint,
    TreatmentComparison,
    TreatmentRateSummary,
)
from app.services.patient_service import CohortTooSmallError
from app.services.treatment_service import MIN_COMPARISON_SAMPLE_SIZE, TreatmentService

router = APIRouter()


def _read_treatment_reports(
    user: CurrentUser = Depends(get_current_active_user),
) -> CurrentUser:
    """Doctor holds TREATMENT_REPORT_READ_LIMITED, not the full
    TREATMENT_REPORT_READ hospital_admin/researcher/system_admin hold - per
    SRS section 9 all three clinical roles get "Treatment Effectiveness
    Reports: Yes", so this accepts either permission rather than locking
    doctors out of a report the access matrix grants them.
    """
    if not (
        has_permission(user.role, Permission.TREATMENT_REPORT_READ)
        or has_permission(user.role, Permission.TREATMENT_REPORT_READ_LIMITED)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' lacks permission to read treatment reports",
        )
    return user


@router.get("", response_model=list[TreatmentRateSummary], summary="Treatment effectiveness rollup")
def list_treatment_effectiveness(
    treatment_name: str | None = Query(default=None),
    department: str | None = Query(default=None),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[TreatmentRateSummary]:
    """Return recovery/success rollups per treatment."""
    rows = TreatmentService(db).list_effectiveness(treatment_name, department)
    return [
        TreatmentRateSummary(
            treatment_name=row.treatment_name,
            sample_size=row.sample_size,
            average_recovery_score=row.average_recovery_score,
            success_rate=row.success_count / row.sample_size if row.sample_size else 0.0,
        )
        for row in rows
    ]


@router.get(
    "/recovery-trends", response_model=list[RecoveryTrendPoint], summary="Recovery trend series"
)
def recovery_trends(
    treatment_name: str | None = Query(default=None),
    weeks: int = Query(default=12, ge=1, le=104),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[RecoveryTrendPoint]:
    """Return a weekly recovery-score time series."""
    points = TreatmentService(db).recovery_trends(treatment_name, weeks)
    return [
        RecoveryTrendPoint(
            week_start=point.week_start,
            average_recovery_score=point.average_recovery_score,
            sample_size=point.sample_size,
        )
        for point in points
    ]


@router.get(
    "/readmission-reduction",
    response_model=ReadmissionReduction,
    summary="Readmission rate for one treatment vs. the hospital baseline",
)
def readmission_reduction(
    treatment_name: str = Query(...),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> ReadmissionReduction:
    """Compare one treatment's readmission rate against the hospital-wide baseline."""
    result = TreatmentService(db).readmission_reduction(treatment_name)
    return ReadmissionReduction.model_validate(result)


@router.get(
    "/compare",
    response_model=list[TreatmentComparison],
    summary="Compare treatments within one diagnosis cohort",
)
def compare_treatments(
    diagnosis: str = Query(...),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[TreatmentComparison]:
    """Compare recovery/success/readmission figures across treatments for one diagnosis.

    422 when fewer than MIN_COMPARISON_SAMPLE_SIZE treatment records exist for
    the diagnosis - a small sample would imply a conclusion it cannot support.
    """
    try:
        rows = TreatmentService(db).compare_treatments(diagnosis)
    except CohortTooSmallError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "cohort_too_small",
                "minimum": MIN_COMPARISON_SAMPLE_SIZE,
                "actual": exc.size,
            },
        ) from exc
    return [
        TreatmentComparison(
            treatment_name=row.treatment_name,
            sample_size=row.sample_size,
            average_recovery_score=row.average_recovery_score,
            success_rate=row.success_rate,
            readmission_rate=row.readmission_rate,
        )
        for row in rows
    ]
