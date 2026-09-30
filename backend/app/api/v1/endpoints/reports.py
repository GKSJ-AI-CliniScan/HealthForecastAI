"""Patient outcome reports and data exports - Milestone 3.

Every endpoint here writes to the audit log. Who generated or downloaded what,
and when, is the first question after any data incident.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_any_permission, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
from app.services import reports_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CanReadPatients = Annotated[
    User,
    Depends(require_any_permission(Permission.PATIENT_READ_ASSIGNED, Permission.PATIENT_READ_ALL)),
]
CanExportAnalytics = Annotated[User, Depends(require_permission(Permission.ANALYTICS_EXPORT))]
CanExportResearch = Annotated[User, Depends(require_permission(Permission.RESEARCH_DATASET_EXPORT))]


def csv_response(body: str, filename: str, headers: dict[str, str] | None = None) -> Response:
    """Return CSV as a download, never to be sniffed or rendered as HTML."""
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
            **(headers or {}),
        },
    )


@router.get("/patients/{patient_id}/outcome", summary="Patient outcome report")
def patient_outcome(patient_id: int, user: CanReadPatients, db: DbSession) -> dict[str, object]:
    """An outcome report for one patient: admissions, treatments, risk and reasoning.

    A patient outside the caller's scope is a 404, not a 403. Recommendations are
    included only for roles the access matrix allows to generate them.
    """
    report = reports_service.patient_outcome_report(db, user, patient_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return report


@router.get("/hospital-performance", summary="Hospital performance export", response_model=None)
def hospital_performance(
    user: CanExportAnalytics,
    db: DbSession,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
) -> Response | dict[str, object]:
    """Aggregate performance tables as CSV or JSON. No patient-level data."""
    if format == "json":
        rows = reports_service.hospital_performance_rows(db, user)
        return {"columns": reports_service.PERFORMANCE_COLUMNS, "rows": rows}

    body, count = reports_service.hospital_performance_export(db, user)
    return csv_response(body, "hospital-performance.csv", {"X-Row-Count": str(count)})


@router.get("/research-dataset", summary="De-identified research dataset")
def research_dataset(
    user: CanExportResearch,
    db: DbSession,
    k: int = Query(default=reports_service.DEFAULT_K, ge=5, le=100),
    limit: int = Query(default=50000, ge=1, le=100000),
) -> Response:
    """A k-anonymous, pseudonymised patient-level dataset as CSV.

    Rows whose combination of age band, gender, race, diagnosis and admission type
    appears fewer than k times are suppressed. k cannot be set below 5.
    """
    body, summary = reports_service.research_dataset_export(db, user, k=k, limit=limit)
    return csv_response(
        body,
        "research-dataset.csv",
        {
            "X-K-Anonymity": str(summary["k"]),
            "X-Released-Rows": str(summary["released_rows"]),
            "X-Suppressed-Rows": str(summary["suppressed_rows"]),
        },
    )
