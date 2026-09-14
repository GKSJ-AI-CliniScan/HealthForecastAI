"""Forecasting and risk reporting endpoints - Milestone 2 (FR-RPT-02, FR-RPT-03).

Authorisation here follows the SRS RBAC matrix row "Risk Prediction Reports":
doctor, hospital administrator and system administrator may read a report, and a
researcher may read aggregated figures only. No single permission in
app.core.rbac spans exactly those three roles, so the guard accepts either
risk_report:read or risk_report:read_aggregated and the service narrows what the
body actually contains. That keeps the mentor-owned access matrix untouched
while still matching the specified behaviour.

Row level scope is never decided here - ReportService resolves it through the
same helpers the patient endpoints use.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user
from app.core.rbac import Permission, Role, has_permission
from app.db.session import get_db
from app.schemas.report import ForecastingReport, PatientRiskReport
from app.services.patient_service import PatientNotFoundError
from app.services.report_service import (
    DEFAULT_HORIZONS,
    InvalidReportRequestError,
    ReportService,
)

router = APIRouter()

# Either permission admits a caller to reporting; the service decides how much of
# the report they see. Researchers hold only the aggregated permission.
_REPORT_PERMISSIONS = (
    Permission.RISK_REPORT_READ,
    Permission.RISK_REPORT_READ_AGGREGATED,
)


def require_report_access(
    user: CurrentUser = Depends(get_current_active_user),
) -> CurrentUser:
    """Admit any role the access matrix grants some form of risk reporting."""
    if not any(has_permission(user.role, permission) for permission in _REPORT_PERMISSIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' is not permitted to read risk reports",
        )
    return user


def _patient_not_found(patient_id: int) -> HTTPException:
    """Build the 404 used for both a missing and an out of scope patient.

    Matches endpoints/patients.py: a 403 would confirm the record exists, which
    discloses another clinician's caseload.
    """
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No patient with id {patient_id}"
    )


@router.get(
    "/forecast",
    response_model=ForecastingReport,
    summary="Generate a readmission forecasting report",
)
def forecasting_report(
    horizon_days: list[int] = Query(
        default=list(DEFAULT_HORIZONS),
        description="One or more projection windows, in days (1-365).",
    ),
    include_patients: bool = Query(
        default=True,
        description=(
            "Include the identifiable high risk cohort. Always omitted for "
            "researchers, who receive aggregated figures only."
        ),
    ),
    user: CurrentUser = Depends(require_report_access),
    db: Session = Depends(get_db),
) -> ForecastingReport:
    """Return a forecasting report over the patients the caller may see.

    Scope follows the access matrix: a doctor reports on their own caseload, a
    hospital or system administrator on the hospital, and a researcher receives
    aggregates with no patient rows attached.
    """
    if not horizon_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one horizon_days value",
        )
    try:
        return ReportService(db).forecasting_report(
            user,
            horizons=tuple(horizon_days),
            include_patients=include_patients,
        )
    except InvalidReportRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get(
    "/patients/{patient_id}",
    response_model=PatientRiskReport,
    summary="Generate a readmission risk report for one patient",
)
def patient_report(
    patient_id: int,
    user: CurrentUser = Depends(require_report_access),
    db: Session = Depends(get_db),
) -> PatientRiskReport:
    """Return one patient's risk report.

    Researchers are refused: the access matrix grants them aggregated risk
    reporting only, and this report is identifiable by definition.
    """
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers may read aggregated reports only",
        )
    try:
        return ReportService(db).patient_report(user, patient_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
