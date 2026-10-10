"""Healthcare analytics dashboard endpoints - Module 6."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import HospitalAnalyticsSummary
from app.services import analytics_service

router = APIRouter()


@router.get("/summary", response_model=HospitalAnalyticsSummary)
def hospital_summary(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> HospitalAnalyticsSummary:
    """Return the headline KPIs for the hospital dashboard."""
    return analytics_service.get_hospital_summary(db)


@router.get("/readmissions", summary="Readmission analytics series")
def readmission_analytics(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> list[dict[str, Any]]:
    """Return readmission rate over time and discharge disposition."""
    return analytics_service.get_readmission_trends(db)


@router.get("/population-health", summary="Population health statistics")
def population_health(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
) -> dict[str, Any]:
    """Return aggregated population health statistics for researchers."""
    return analytics_service.get_population_health(db)
