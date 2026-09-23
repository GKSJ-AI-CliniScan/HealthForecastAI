"""Healthcare analytics dashboard endpoints - Module 6."""

from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.analytics import HospitalAnalyticsSummary
from app.services.analytics_service import (
    get_hospital_analytics_summary,
    get_performance_kpis,
    get_population_health_data,
    get_readmission_trends,
)

router = APIRouter()


@router.get(
    "/summary",
    response_model=HospitalAnalyticsSummary,
    summary="Hospital executive analytics summary",
)
def hospital_summary(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> HospitalAnalyticsSummary:
    """Return the headline KPIs for the hospital administration dashboard."""
    return get_hospital_analytics_summary()


@router.get("/readmissions", summary="Readmission analytics trend series")
def readmission_analytics(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> list[dict[str, Any]]:
    """Return monthly readmission rate trends and disposition breakdown."""
    return get_readmission_trends()


@router.get("/population-health", summary="Aggregated population health statistics")
def population_health(
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
) -> dict[str, Any]:
    """Return strictly aggregated population health statistics for clinical researchers."""
    return get_population_health_data()


@router.get("/performance", summary="Operational hospital performance indicators")
def hospital_performance(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> dict[str, Any]:
    """Return bed occupancy, discharge velocity, and ICU utilization KPIs."""
    return get_performance_kpis()
