"""Treatment effectiveness endpoints - Module 4.

Doctors hold TREATMENT_REPORT_READ_LIMITED: every figure below is computed
over their own patients only (TreatmentService applies patient_scope_for).
Roles holding the full TREATMENT_REPORT_READ get hospital-wide figures.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user
from app.api.errors import cohort_too_small
from app.core.rbac import Permission, has_permission
from app.db.session import get_db
from app.schemas.treatment import (
    DepartmentEffectiveness,
    ReadmissionReduction,
    RecoveryTrendPoint,
    TreatmentComparison,
    TreatmentOutcomeDistribution,
    TreatmentRateSummary,
)
from app.services.patient_service import CohortTooSmallError
from app.services.treatment_service import TreatmentNotFoundError, TreatmentService

router = APIRouter()

# String filter bounds mirror the columns they match: treatment_name and
# primary_diagnosis VARCHAR(255), department VARCHAR(100).
_READ_RESPONSES: dict[int | str, dict[str, str]] = {
    401: {"description": "Not authenticated"},
    403: {"description": "Role holds no treatment report permission"},
}


def _read_treatment_reports(
    user: CurrentUser = Depends(get_current_active_user),
) -> CurrentUser:
    """Accept either the full or the _LIMITED treatment report permission.

    Per SRS section 9 all three clinical roles get "Treatment Effectiveness
    Reports: Yes"; the doctor's grant is the limited one, which the service
    layer honours by narrowing to their own patients.
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


@router.get(
    "",
    response_model=list[TreatmentRateSummary],
    summary="Treatment effectiveness rollup",
    responses=_READ_RESPONSES,
)
def list_treatment_effectiveness(
    treatment_name: str | None = Query(default=None, min_length=1, max_length=255),
    department: str | None = Query(default=None, min_length=1, max_length=100),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[TreatmentRateSummary]:
    """Return sample size, average recovery score and success rate
    (share of outcomes recorded as "improved") per treatment."""
    rows = TreatmentService(db).list_effectiveness(user, treatment_name, department)
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
    "/outcomes",
    response_model=list[TreatmentOutcomeDistribution],
    summary="Outcome distribution per treatment",
    responses=_READ_RESPONSES,
)
def treatment_outcome_distribution(
    treatment_name: str | None = Query(default=None, min_length=1, max_length=255),
    department: str | None = Query(default=None, min_length=1, max_length=100),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[TreatmentOutcomeDistribution]:
    """Cross-tabulate recorded outcomes against treatment (FR-ANL-02).
    Every outcome value is present in each breakdown; NULL outcomes are
    counted as "unrecorded"."""
    rows = TreatmentService(db).outcome_distribution(user, treatment_name, department)
    return [
        TreatmentOutcomeDistribution(
            treatment_name=name, sample_size=sum(outcomes.values()), outcomes=outcomes
        )
        for name, outcomes in rows
    ]


@router.get(
    "/departments",
    response_model=list[DepartmentEffectiveness],
    summary="Treatment effectiveness per department",
    responses=_READ_RESPONSES,
)
def department_effectiveness(
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[DepartmentEffectiveness]:
    """Recovery, success and readmission rates grouped by admission department.
    Admissions without a department are reported as "unassigned"."""
    rows = TreatmentService(db).department_effectiveness(user)
    return [
        DepartmentEffectiveness(
            department=row.department,
            sample_size=row.sample_size,
            average_recovery_score=row.average_recovery_score,
            success_rate=row.success_rate,
            readmission_rate=row.readmission_rate,
        )
        for row in rows
    ]


@router.get(
    "/recovery-trends",
    response_model=list[RecoveryTrendPoint],
    summary="Recovery trend series",
    responses=_READ_RESPONSES,
)
def recovery_trends(
    treatment_name: str | None = Query(default=None, min_length=1, max_length=255),
    weeks: int = Query(default=12, ge=1, le=104),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[RecoveryTrendPoint]:
    """Weekly average recovery score by discharge week, most recent ``weeks`` with data."""
    points = TreatmentService(db).recovery_trends(user, treatment_name, weeks)
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
    summary="Readmission rate for one treatment vs. the baseline",
    responses={**_READ_RESPONSES, 404: {"description": "No outcomes recorded for treatment"}},
)
def readmission_reduction(
    treatment_name: str = Query(..., min_length=1, max_length=255),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> ReadmissionReduction:
    """Compare one treatment's readmission rate against the baseline over the
    same scope (hospital-wide, or the doctor's own patients)."""
    try:
        result = TreatmentService(db).readmission_reduction(user, treatment_name)
    except TreatmentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No treatment outcomes recorded for '{treatment_name}'",
        ) from exc
    return ReadmissionReduction.model_validate(result)


@router.get(
    "/compare",
    response_model=list[TreatmentComparison],
    summary="Compare treatments within one diagnosis cohort",
    responses={**_READ_RESPONSES, 422: {"description": "Invalid input or cohort_too_small"}},
)
def compare_treatments(
    diagnosis: str = Query(..., min_length=1, max_length=255),
    user: CurrentUser = Depends(_read_treatment_reports),
    db: Session = Depends(get_db),
) -> list[TreatmentComparison]:
    """Compare recovery/success/readmission figures across treatments for one diagnosis.

    422 cohort_too_small when fewer than MIN_COMPARISON_SAMPLE_SIZE treatment
    records exist for the diagnosis - a small sample would imply a conclusion
    it cannot support.
    """
    try:
        rows = TreatmentService(db).compare_treatments(user, diagnosis)
    except CohortTooSmallError as exc:
        raise cohort_too_small(exc) from exc
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
