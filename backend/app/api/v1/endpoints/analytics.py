"""Healthcare analytics dashboard endpoints - Module 6.

Milestone 1 delivers the descriptive dashboard. Milestone 3 extends it with
treatment effectiveness and trend monitoring.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
from app.services import analytics_service, performance_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CanReadAnalytics = Annotated[User, Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ))]
CanReadPopulation = Annotated[User, Depends(require_permission(Permission.POPULATION_HEALTH_READ))]


@router.get("/dashboard", summary="Headline KPIs for the caller's dashboard")
def dashboard(user: CurrentUser, db: DbSession) -> dict[str, object]:
    """Return the KPI tiles for whichever dashboard the caller lands on.

    Available to every authenticated role, but the numbers are scoped: a doctor
    sees their own caseload, everyone else sees the hospital.
    """
    return analytics_service.dashboard_summary(db, user)


@router.get("/summary", summary="Hospital-wide KPI summary")
def hospital_summary(user: CanReadAnalytics, db: DbSession) -> dict[str, object]:
    """Return the hospital administrator's KPI summary."""
    return analytics_service.dashboard_summary(db, user)


@router.get("/readmissions/by-age", summary="Readmission rate by age band")
def readmissions_by_age(user: CanReadAnalytics, db: DbSession) -> list[dict[str, object]]:
    """Return the 30-day readmission rate for each age band."""
    return analytics_service.readmission_by_age_group(db)


@router.get("/readmissions/by-admission-type", summary="Readmission rate by admission type")
def readmissions_by_type(user: CanReadAnalytics, db: DbSession) -> list[dict[str, object]]:
    """Return the 30-day readmission rate for each admission type."""
    return analytics_service.readmission_by_admission_type(db)


@router.get("/length-of-stay", summary="Length of stay distribution")
def length_of_stay(user: CanReadAnalytics, db: DbSession) -> list[dict[str, int]]:
    """Return how many admissions lasted each number of days."""
    return analytics_service.length_of_stay_distribution(db)


@router.get("/population-health", summary="Population health statistics")
def population_health(user: CanReadPopulation, db: DbSession) -> dict[str, object]:
    """Return aggregated population health statistics for researchers.

    Aggregate values only - never a row level record.
    """
    return analytics_service.population_health_overview(db)


@router.get("/performance", summary="Risk-adjusted performance by one dimension")
def performance(
    user: CanReadAnalytics,
    db: DbSession,
    dimension: str = Query(default="department", description="One of the listed dimensions"),
) -> dict[str, object]:
    """Observed against expected readmissions for every value of a dimension.

    Expected comes from the risk model, so a department with sicker patients is
    not penalised for them. The verdict only calls a group worse or better when
    the interval excludes 1.
    """
    try:
        return performance_service.performance(db, user, dimension)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("/performance-dimensions", summary="The dimensions performance can be cut by")
def performance_dimensions(user: CanReadAnalytics) -> list[dict[str, str]]:
    """List the available dimensions, for building a selector."""
    return [
        {"key": key, "title": title} for key, (title, _) in performance_service.DIMENSIONS.items()
    ]


@router.get("/trends", summary="Trend monitoring with control limits")
def trends(
    user: CanReadAnalytics, db: DbSession, buckets: int = Query(default=10, ge=4, le=20)
) -> dict[str, object]:
    """Readmission rate across equal cohorts with p-chart control limits.

    The source data has no dates, so the axis is the encounter sequence; the
    response says so. Only points outside the limits, or a run of eight on one
    side of the centre line, are reported as signals.
    """
    return performance_service.sequence_trend(db, user, buckets)
