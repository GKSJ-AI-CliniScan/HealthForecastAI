"""Healthcare analytics dashboard endpoints - Module 6.

Milestone 1 delivers the descriptive dashboard. Milestone 3 extends it with
treatment effectiveness and trend monitoring.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
from app.services import analytics_service

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
