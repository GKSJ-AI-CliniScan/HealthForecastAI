"""Healthcare analytics dashboard endpoints."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.analytics import (
    HospitalAnalyticsSummary,
    PopulationHealthResponse,
    ReadmissionTrend,
)
from app.services.analytics_service import (
    get_hospital_summary,
    get_population_health,
    get_readmission_trends,
)

router = APIRouter()


@router.get(
    "/summary",
    response_model=HospitalAnalyticsSummary,
)
def hospital_summary(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> HospitalAnalyticsSummary:
    """Return headline KPIs for the hospital dashboard."""

    return get_hospital_summary(db)


@router.get(
    "/readmissions",
    response_model=list[ReadmissionTrend],
    summary="Readmission analytics series",
)
def readmission_analytics(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> list[ReadmissionTrend]:
    """Return monthly readmission statistics."""

    return get_readmission_trends(db)


@router.get(
    "/population-health",
    response_model=PopulationHealthResponse,
    summary="Population health statistics",
)
def population_health(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
) -> PopulationHealthResponse:
    """Return aggregated population-health statistics."""

    return PopulationHealthResponse(
        cohorts=get_population_health(db),
        generated_at=datetime.now(UTC),
    )
