"""Healthcare analytics endpoints - Module 6."""

import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.services import analytics_service

router = APIRouter()


@router.get("/summary", summary="Hospital Summary")
def hospital_summary(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> dict:
    return analytics_service.get_hospital_summary(db)


@router.get("/readmissions", summary="Readmission analytics series")
def readmission_analytics(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.HOSPITAL_ANALYTICS_READ)),
) -> dict:
    return analytics_service.get_readmission_analytics(db)


@router.get("/population-health", summary="Population health statistics")
def population_health(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.POPULATION_HEALTH_READ)),
) -> dict:
    return analytics_service.get_population_health(db)


@router.get("/export/readmissions.csv", summary="Export readmission report as CSV")
def export_readmissions_csv(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.ANALYTICS_EXPORT)),
) -> StreamingResponse:
    data = analytics_service.get_readmission_analytics(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Risk Category", "Patient Count"])
    for row in data["current_distribution"]:
        writer.writerow([row["risk_category"], row["count"]])
    writer.writerow([])
    writer.writerow(["Total predictions ever run", data["total_predictions_ever_run"]])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=readmission_report.csv"},
    )
