"""Healthcare analytics dashboard endpoints - Module 6."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import (
    DischargeOutcomeDistribution,
    HospitalAnalyticsSummary,
    PopulationHealthSummary,
    ReadmissionTrendPoint,
)
from app.services.analytics_service import AnalyticsService, CohortTooSmallError

router = APIRouter()


@router.get("/summary", response_model=HospitalAnalyticsSummary)
def hospital_summary(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
    db: Session = Depends(get_db),
) -> HospitalAnalyticsSummary:
    """Return the headline KPIs for the hospital dashboard.

    Doctor access is "Limited" per SRS section 9: AnalyticsService narrows
    every figure to the caller's own assigned patients when the caller is a
    doctor, the same scope_clause every other patient-scoped read reuses.
    """
    return AnalyticsService(db).hospital_summary(user)


@router.get(
    "/readmissions",
    response_model=list[ReadmissionTrendPoint],
    summary="Readmission analytics series",
)
def readmission_analytics(
    months: int = Query(default=12, ge=1, le=60),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
    db: Session = Depends(get_db),
) -> list[ReadmissionTrendPoint]:
    """Return readmission rate over time, most recent ``months`` months."""
    rows = AnalyticsService(db).readmission_analytics(user, months)
    return [ReadmissionTrendPoint(**row) for row in rows]


@router.get(
    "/discharge-outcomes",
    response_model=DischargeOutcomeDistribution,
    summary="Discharge disposition distribution",
)
def discharge_outcomes(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
    db: Session = Depends(get_db),
) -> DischargeOutcomeDistribution:
    """Return admission counts grouped by discharge disposition."""
    distribution = AnalyticsService(db).discharge_outcomes(user)
    return DischargeOutcomeDistribution(distribution=distribution)


@router.get(
    "/population-health",
    response_model=PopulationHealthSummary,
    summary="Population health statistics",
)
def population_health(
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
    db: Session = Depends(get_db),
) -> PopulationHealthSummary:
    """Return aggregated population health statistics for researchers.

    Only ever aggregate values - no row-level patient record is exposed here.
    422 when the hospital-wide patient count is below the configured minimum,
    since even an aggregate over a handful of patients risks re-identification.
    """
    try:
        result = AnalyticsService(db).population_health(user)
    except CohortTooSmallError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "cohort_too_small", "minimum": exc.minimum, "actual": exc.size},
        ) from exc
    return PopulationHealthSummary(**result)
