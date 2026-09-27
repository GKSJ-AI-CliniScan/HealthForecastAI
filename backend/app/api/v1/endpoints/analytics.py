"""Healthcare analytics dashboard endpoints - Module 6.

Access (app/core/rbac.py):
  - dashboard endpoints: HOSPITAL_ANALYTICS_READ (hospital_admin, researcher,
    system_admin). Doctors are refused - see the documented gap in rbac.py.
  - population / cohort statistics: POPULATION_HEALTH_READ
  - anonymised dataset export: RESEARCH_DATASET_EXPORT (researcher, system_admin)
"""

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.api.errors import cohort_too_small
from app.api.filters import date_range, research_cohort_filter
from app.core.config import settings
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import (
    CohortStatistics,
    DateRange,
    DepartmentAnalytics,
    DepartmentSortField,
    DischargeOutcomeDistribution,
    HospitalAnalyticsSummary,
    PopulationHealthSummary,
    ReadmissionTrendPoint,
    ResearchCohortFilter,
    SortOrder,
    TrendMetric,
    TrendPoint,
)
from app.services.analytics_service import AnalyticsService, CohortTooSmallError
from app.services.patient_service import PatientService
from app.utils.anonymisation import anonymise_patient, research_csv

router = APIRouter()

_read_hospital_analytics = require_permission(Permission.HOSPITAL_ANALYTICS_READ)
_read_population_health = require_permission(Permission.POPULATION_HEALTH_READ)

_AUTH_RESPONSES: dict[int | str, dict[str, str]] = {
    401: {"description": "Not authenticated"},
    403: {"description": "Role lacks the required permission"},
}
_COHORT_RESPONSES: dict[int | str, dict[str, str]] = {
    **_AUTH_RESPONSES,
    422: {"description": "Invalid filter, or cohort_too_small"},
}


@router.get(
    "/summary",
    response_model=HospitalAnalyticsSummary,
    summary="Hospital KPI summary",
    responses=_AUTH_RESPONSES,
)
def hospital_summary(
    user: CurrentUser = Depends(_read_hospital_analytics),
    db: Session = Depends(get_db),
) -> HospitalAnalyticsSummary:
    """Headline KPIs: patients, admissions, readmission rate, average length
    of stay and the distribution of each patient's latest risk category."""
    return AnalyticsService(db).hospital_summary(user)


@router.get(
    "/readmissions",
    response_model=list[ReadmissionTrendPoint],
    summary="Readmission analytics series",
    responses=_AUTH_RESPONSES,
)
def readmission_analytics(
    months: int = Query(default=12, ge=1, le=60),
    user: CurrentUser = Depends(_read_hospital_analytics),
    db: Session = Depends(get_db),
) -> list[ReadmissionTrendPoint]:
    """Monthly readmission rate by admission month, most recent ``months`` with data."""
    rows = AnalyticsService(db).readmission_analytics(user, months)
    return [ReadmissionTrendPoint(**row) for row in rows]


@router.get(
    "/discharge-outcomes",
    response_model=DischargeOutcomeDistribution,
    summary="Discharge disposition distribution",
    responses=_AUTH_RESPONSES,
)
def discharge_outcomes(
    user: CurrentUser = Depends(_read_hospital_analytics),
    db: Session = Depends(get_db),
) -> DischargeOutcomeDistribution:
    """Admission counts grouped by discharge disposition."""
    distribution = AnalyticsService(db).discharge_outcomes(user)
    return DischargeOutcomeDistribution(distribution=distribution)


@router.get(
    "/departments",
    response_model=list[DepartmentAnalytics],
    summary="Department analytics",
    responses={**_AUTH_RESPONSES, 422: {"description": "Invalid filter or sort"}},
)
def department_analytics(
    window: DateRange = Depends(date_range),
    sort_by: DepartmentSortField = Query(default="department"),
    order: SortOrder = Query(default="asc"),
    user: CurrentUser = Depends(_read_hospital_analytics),
    db: Session = Depends(get_db),
) -> list[DepartmentAnalytics]:
    """Per-department patients, admissions, average stay and readmission rate,
    optionally limited to an admission-date window. Admissions with no
    department are reported as "unassigned"."""
    rows = AnalyticsService(db).department_analytics(user, window, sort_by, order)
    return [DepartmentAnalytics(**row) for row in rows]


@router.get(
    "/trends",
    response_model=list[TrendPoint],
    summary="Outcome or risk trend series",
    responses={**_AUTH_RESPONSES, 422: {"description": "Unknown metric"}},
)
def trends(
    metric: TrendMetric = Query(..., description="outcome or risk"),
    months: int = Query(default=12, ge=1, le=60),
    user: CurrentUser = Depends(_read_hospital_analytics),
    db: Session = Depends(get_db),
) -> list[TrendPoint]:
    """One monthly {period, total, breakdown} series.

    - ``outcome``: treatment outcomes by discharge month, broken down by outcome
    - ``risk``: risk scores issued per month, broken down by risk category

    Readmission and recovery trends have their own endpoints
    (/analytics/readmissions, /treatment/recovery-trends).
    """
    rows = AnalyticsService(db).trends(user, metric, months)
    return [TrendPoint(**row) for row in rows]


@router.get(
    "/population-health",
    response_model=PopulationHealthSummary,
    summary="Population health statistics",
    responses=_COHORT_RESPONSES,
)
def population_health(
    user: CurrentUser = Depends(_read_population_health),
    db: Session = Depends(get_db),
) -> PopulationHealthSummary:
    """Aggregated population statistics - never a row-level record.

    422 cohort_too_small when the hospital-wide patient count is below the
    configured minimum, since even an aggregate over a handful of patients
    risks re-identification.
    """
    try:
        result = AnalyticsService(db).population_health(user)
    except CohortTooSmallError as exc:
        raise cohort_too_small(exc) from exc
    return PopulationHealthSummary(**result)


@router.get(
    "/research-cohort",
    response_model=CohortStatistics,
    summary="Statistics for a filtered research cohort",
    responses=_COHORT_RESPONSES,
)
def research_cohort_statistics(
    filters: ResearchCohortFilter = Depends(research_cohort_filter),
    user: CurrentUser = Depends(_read_population_health),
    db: Session = Depends(get_db),
) -> CohortStatistics:
    """Size and demographic/diagnosis breakdown of a filtered cohort, using the
    same generalised values the anonymised export exposes.

    422 cohort_too_small when the filtered cohort is below the configured
    minimum - the guard applies after filtering, so filters cannot isolate a
    small group.
    """
    try:
        result = AnalyticsService(db).cohort_statistics(user, filters)
    except CohortTooSmallError as exc:
        raise cohort_too_small(exc) from exc
    return CohortStatistics(**result)


@router.get(
    "/research-export",
    response_class=Response,
    summary="Download an anonymised research dataset (CSV)",
    responses={
        200: {"content": {"text/csv": {}}, "description": "Anonymised cohort as CSV"},
        **_COHORT_RESPONSES,
    },
)
def research_export(
    filters: ResearchCohortFilter = Depends(research_cohort_filter),
    user: CurrentUser = Depends(require_permission(Permission.RESEARCH_DATASET_EXPORT)),
    db: Session = Depends(get_db),
) -> Response:
    """Anonymised cohort as a CSV attachment: pseudonymous id, generalised age
    band, gender and primary diagnosis only. The export is audit-logged.

    422 cohort_too_small when the filtered cohort is below the configured minimum.
    """
    try:
        patients = PatientService(db).list_for_research(user, filters=filters)
    except CohortTooSmallError as exc:
        raise cohort_too_small(exc) from exc
    body = research_csv(anonymise_patient(p, settings.ANONYMISATION_SALT) for p in patients)
    return Response(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="research_cohort.csv"'},
    )
