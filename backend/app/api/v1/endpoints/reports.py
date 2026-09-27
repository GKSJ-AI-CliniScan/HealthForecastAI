"""Reporting & export endpoints - Reporting module (FR-RPT-01/02).

Access (app/core/rbac.py): every route needs ANALYTICS_EXPORT (hospital_admin,
researcher, system_admin), plus - for generation and download - the analytics
permission behind that report type's data (ReportService.REPORT_PERMISSIONS).
Users see only their own reports; system administrators see all of them. A
report owned by someone else answers 404, not 403, so its existence is not
disclosed.

Known gap, preserved: doctors hold no ANALYTICS_EXPORT, so they cannot use
these routes. FR-RPT-03's per-patient outcome report for doctors is a
different (patient-level) report that none of these analytics types cover.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.api.errors import cohort_too_small
from app.core.config import settings
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.report import (
    ReportGenerateRequest,
    ReportPurgeResult,
    ReportRead,
    ReportType,
)
from app.services.report_service import (
    CohortTooSmallError,
    ReportFileMissingError,
    ReportForbiddenError,
    ReportNotFoundError,
    ReportService,
)
from app.utils.report_exporters import MEDIA_TYPES

router = APIRouter()

_export_reports = require_permission(Permission.ANALYTICS_EXPORT)

_AUTH_RESPONSES: dict[int | str, dict[str, str]] = {
    401: {"description": "Not authenticated"},
    403: {"description": "Role lacks the required permission"},
}
_NOT_FOUND: dict[int | str, dict[str, str]] = {
    404: {"description": "No such report, or it belongs to another user"}
}


def _not_found(report_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No report with id {report_id}"
    )


def _forbidden(report_type: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Role lacks the analytics permission required for '{report_type}' reports",
    )


@router.post(
    "/generate",
    response_model=ReportRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate and store a report",
    responses={**_AUTH_RESPONSES, 422: {"description": "Invalid request, or cohort_too_small"}},
)
def generate_report(
    payload: ReportGenerateRequest,
    user: CurrentUser = Depends(_export_reports),
    db: Session = Depends(get_db),
) -> ReportRead:
    """Generate a report in CSV, Excel (.xlsx) or PDF format and store it.

    Filters must apply to the chosen report type; an unsupported filter is
    rejected with 422 rather than ignored. Population health and research
    cohort reports are subject to the same cohort-size guard as their
    analytics endpoints (422 cohort_too_small).
    """
    try:
        report = ReportService(db).generate(user, payload)
    except ReportForbiddenError as exc:
        raise _forbidden(payload.report_type) from exc
    except CohortTooSmallError as exc:
        raise cohort_too_small(exc) from exc
    return ReportRead.model_validate(report)


@router.get(
    "",
    response_model=list[ReportRead],
    summary="Report history",
    responses={**_AUTH_RESPONSES, 422: {"description": "Invalid filter or pagination"}},
)
def list_reports(
    response: Response,
    report_type: ReportType | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(_export_reports),
    db: Session = Depends(get_db),
) -> list[ReportRead]:
    """The caller's reports, newest first (every user's for a system administrator)."""
    rows, total = ReportService(db).list_reports(user, report_type, limit, offset)
    response.headers["X-Total-Count"] = str(total)
    return [ReportRead.model_validate(row) for row in rows]


@router.post(
    "/purge",
    response_model=ReportPurgeResult,
    summary="Delete reports older than the retention window",
    responses=_AUTH_RESPONSES,
)
def purge_reports(
    older_than_days: int | None = Query(
        default=None, ge=1, le=3650, description="Defaults to REPORT_RETENTION_DAYS"
    ),
    user: CurrentUser = Depends(require_permission(Permission.SYSTEM_CONFIGURE)),
    db: Session = Depends(get_db),
) -> ReportPurgeResult:
    """Remove every report, row and file, generated before the retention cutoff."""
    days = older_than_days or settings.REPORT_RETENTION_DAYS
    deleted = ReportService(db).purge_expired(user, days)
    return ReportPurgeResult(deleted=deleted, older_than_days=days)


@router.get(
    "/{report_id}",
    response_model=ReportRead,
    summary="Read one report's metadata",
    responses={**_AUTH_RESPONSES, **_NOT_FOUND},
)
def get_report(
    report_id: int,
    user: CurrentUser = Depends(_export_reports),
    db: Session = Depends(get_db),
) -> ReportRead:
    """Metadata for one of the caller's reports."""
    try:
        report = ReportService(db).get_report(user, report_id)
    except ReportNotFoundError as exc:
        raise _not_found(report_id) from exc
    return ReportRead.model_validate(report)


@router.get(
    "/{report_id}/download",
    response_class=FileResponse,
    summary="Download a report file",
    responses={
        200: {
            "description": "The report file",
            "content": {media_type.split(";")[0]: {} for media_type in MEDIA_TYPES.values()},
        },
        **_AUTH_RESPONSES,
        **_NOT_FOUND,
        410: {"description": "The report file is no longer available"},
    },
)
def download_report(
    report_id: int,
    user: CurrentUser = Depends(_export_reports),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Stream the stored file as an attachment."""
    try:
        report, path = ReportService(db).open_download(user, report_id)
    except ReportNotFoundError as exc:
        raise _not_found(report_id) from exc
    except ReportForbiddenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role no longer holds the permission this report's data requires",
        ) from exc
    except ReportFileMissingError as exc:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"The file for report {report_id} is no longer available",
        ) from exc
    stamp = report.generated_at.strftime("%Y%m%d")
    return FileResponse(
        path,
        media_type=MEDIA_TYPES[report.format],
        filename=f"{report.report_type}_{report.id}_{stamp}.{report.format}",
    )


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a report and its file",
    responses={**_AUTH_RESPONSES, **_NOT_FOUND},
)
def delete_report(
    report_id: int,
    user: CurrentUser = Depends(_export_reports),
    db: Session = Depends(get_db),
) -> Response:
    """Delete one of the caller's reports (any report, for a system administrator)."""
    try:
        ReportService(db).delete_report(user, report_id)
    except ReportNotFoundError as exc:
        raise _not_found(report_id) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
