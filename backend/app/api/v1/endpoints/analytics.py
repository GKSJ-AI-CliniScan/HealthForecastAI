"""Healthcare analytics dashboard endpoints - Module 6."""

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.analytics import HospitalAnalyticsSummary
from app.services import analytics_service

router = APIRouter()


@router.get("/summary", response_model=HospitalAnalyticsSummary)
def hospital_summary(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> HospitalAnalyticsSummary:
    """Return the headline KPIs for the hospital dashboard."""
    return analytics_service.hospital_summary()


@router.get("/readmissions", summary="Readmission analytics series")
def readmission_analytics(
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> list[dict[str, float]]:
    """Return admissions and readmission rate per month."""
    return analytics_service.readmission_series()


@router.get("/population-health", summary="Population health statistics")
def population_health(
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
) -> dict[str, object]:
    """Return aggregated cohort statistics only - never row level records."""
    return analytics_service.population_health()


@router.get("/export", summary="Download the readmission series as CSV")
def export_readmissions(
    user: CurrentUser = Depends(require_permission(Permission.ANALYTICS_EXPORT)),
) -> Response:
    """Return the monthly readmission series as a CSV file."""
    return Response(
        content=analytics_service.export_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=readmissions.csv"},
    )
