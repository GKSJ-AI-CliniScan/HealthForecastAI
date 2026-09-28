"""Treatment effectiveness endpoints - Module 4."""

import csv
import io

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.treatment import (
    RecoveryTrendPoint,
    TreatmentEffectivenessSummary,
    TreatmentOutcomeCreate,
    TreatmentOutcomeRead,
)
from app.services import treatment_service

router = APIRouter()


@router.get(
    "", response_model=TreatmentEffectivenessSummary, summary="List Treatment Effectiveness"
)
def list_treatment_effectiveness(
    treatment_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> TreatmentEffectivenessSummary:
    """Real aggregated effectiveness stats - not fixed percentages."""
    result = treatment_service.get_treatment_effectiveness(db, treatment_type)
    return TreatmentEffectivenessSummary(**result)


@router.post("", response_model=TreatmentOutcomeRead, status_code=status.HTTP_201_CREATED)
def create_treatment_outcome(
    payload: TreatmentOutcomeCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> TreatmentOutcomeRead:
    """Record a real treatment outcome."""
    outcome = treatment_service.record_outcome(db, payload)
    return TreatmentOutcomeRead.model_validate(outcome)


@router.get(
    "/recovery-trends", response_model=list[RecoveryTrendPoint], summary="Recovery trend series"
)
def recovery_trends(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[RecoveryTrendPoint]:
    """Real month-by-month trend, computed from stored outcomes."""
    results = treatment_service.get_recovery_trends(db)
    return [RecoveryTrendPoint(**r) for r in results]


@router.get("/patient/{patient_id}", response_model=list[TreatmentOutcomeRead])
def patient_treatment_history(
    patient_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[TreatmentOutcomeRead]:
    return treatment_service.get_patient_treatment_history(db, patient_id)


# backend/app/api/v1/endpoints/treatment.py — add this
@router.get("/export/effectiveness.csv", summary="Export treatment effectiveness report as CSV")
def export_treatment_csv(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.ANALYTICS_EXPORT)),
) -> StreamingResponse:
    summary = treatment_service.get_treatment_effectiveness(db)
    trends = treatment_service.get_recovery_trends(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total cases", summary["total_cases"]])
    writer.writerow(["Improved rate", f"{summary['improved_rate']*100:.1f}%"])
    writer.writerow(["Avg recovery days", summary["avg_recovery_days"]])
    writer.writerow([])
    writer.writerow(["Date", "Avg Effectiveness", "Cases"])
    for t in trends:
        writer.writerow([t["month"], f"{(t['avg_effectiveness'] or 0)*100:.1f}%", t["case_count"]])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=treatment_effectiveness_report.csv"},
    )
