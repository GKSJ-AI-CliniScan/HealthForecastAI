"""Healthcare analytics dashboard endpoints - Module 6."""

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.analytics import HospitalAnalyticsSummary

router = APIRouter()


@router.get("/summary", response_model=HospitalAnalyticsSummary)
def hospital_summary(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> HospitalAnalyticsSummary:
    """Return the headline KPIs for the hospital dashboard.

    TODO(milestone-3): aggregate from PostgreSQL with cached rollups.
    """
    return HospitalAnalyticsSummary()


@router.get("/readmissions", summary="Readmission analytics series")
def readmission_analytics(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> list[dict[str, float]]:
    """Return readmission rate over time.

    TODO(milestone-3): group admissions by month and discharge disposition.
    """
    return []


@router.get("/population-health", summary="Population health statistics")
def population_health(
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
) -> dict[str, object]:
    """Return aggregated population health statistics for researchers.

    TODO(milestone-3): only aggregate values, never row level records.
    """
    return {"cohorts": [], "generated_at": None}
