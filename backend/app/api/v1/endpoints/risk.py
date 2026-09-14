"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user, require_permission
from app.core.rbac import Permission, has_permission
from app.db.session import get_db
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import risk_service
from app.services.patient_service import PatientNotFoundError
from app.services.risk_service import (
    MAX_HORIZON_DAYS,
    MIN_HORIZON_DAYS,
    InvalidForecastRequestError,
)

router = APIRouter()

# The access matrix grants the doctor risk_report:read and the hospital
# administrator risk_report:read_aggregated, so no single permission covers both
# roles. Accepting either admits exactly the roles the matrix intends for risk
# reporting and leaves app.core.rbac untouched. The researcher holds only the
# aggregated permission too, so they are refused separately below - an
# identifiable cohort is not an aggregate.
_HIGH_RISK_PERMISSIONS = (
    Permission.RISK_REPORT_READ,
    Permission.RISK_REPORT_READ_AGGREGATED,
)


def require_high_risk_access(
    user: CurrentUser = Depends(get_current_active_user),
) -> CurrentUser:
    """Admit the roles the access matrix grants the high risk cohort."""
    if not any(has_permission(user.role, permission) for permission in _HIGH_RISK_PERMISSIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' is not permitted to read risk reports",
        )
    if not has_permission(user.role, Permission.PATIENT_READ_ASSIGNED) and not has_permission(
        user.role, Permission.PATIENT_READ_ALL
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This role may read aggregated risk figures only",
        )
    return user


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Run the trained model on one admission, persist it, and return the result.

    A patient the caller may not read returns 404 rather than 403, matching the
    patient endpoints: confirming the record exists would disclose another
    clinician's caseload.
    """
    try:
        record = risk_service.score_and_save(db, payload, user)
    except PatientNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No patient with id {payload.patient_id}",
        ) from exc
    return RiskPredictionRead.model_validate(record)


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_high_risk_access),
) -> list[RiskPredictionRead]:
    """Return the current high risk cohort, scoped to the caller's role.

    Doctor sees their own caseload, including patients granted through
    doctor_patient_map. Hospital and system administrators read hospital wide.
    """
    records = risk_service.get_high_risk_patients(db, user)
    return [RiskPredictionRead.model_validate(r) for r in records]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = Query(
        default=30,
        description=f"Projection window in days ({MIN_HORIZON_DAYS}-{MAX_HORIZON_DAYS}).",
    ),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return a readmission forecast over the patients the caller may see.

    A doctor forecasts over their own caseload; roles the access matrix grants
    hospital wide reads forecast over the hospital. The returned ``scope`` says
    which, so the numbers cannot be read as wider than they are.
    """
    try:
        return risk_service.get_readmission_forecast(db, horizon_days, user)
    except InvalidForecastRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


def explain_risk_factors(payload: RiskPredictionRequest) -> list[str]:
    """Surface the input factors that most plausibly drove this score.

    This is a simple rule-based explanation, not model-derived feature
    importance (e.g. SHAP) - documented as a known limitation.
    """
    factors = []
    if payload.number_inpatient >= 2:
        factors.append(f"{payload.number_inpatient} prior inpatient admissions in the past year")
    if payload.number_emergency >= 2:
        factors.append(f"{payload.number_emergency} prior emergency visits in the past year")
    if payload.time_in_hospital >= 10:
        factors.append(f"Extended current stay ({payload.time_in_hospital} days)")
    if payload.num_medications >= 15:
        factors.append(f"Polypharmacy ({payload.num_medications} medications)")
    if payload.age_group in {"[70-80)", "[80-90)", "[90-100)"}:
        factors.append("Advanced age group")
    return factors or ["No major risk factors identified from the submitted data"]
