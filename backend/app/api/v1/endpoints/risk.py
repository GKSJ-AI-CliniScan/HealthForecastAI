"""Risk prediction and readmission forecasting endpoints - Module 3.

Literal-path routes (predict, readmission, high-risk, forecast) are declared
before the /{patient_id} routes, matching the convention already used in
patients.py (/anonymised before /{patient_id}) so a literal segment is never
shadowed by the dynamic one.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user, require_permission
from app.core.rbac import Permission, has_permission
from app.db.session import get_db
from app.schemas.prediction import (
    ReadmissionForecast,
    ReadmissionPredictionRequest,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services.readmission_service import (
    AdmissionNotFoundError,
    InsufficientPatientDataError,
    ModelNotAvailableError,
    PatientNotFoundError,
    ReadmissionService,
)
from app.services.risk_service import NoPredictionError, RiskService

router = APIRouter()

_read_risk = require_permission(Permission.RISK_REPORT_READ)
_read_readmission = require_permission(Permission.READMISSION_FORECAST_READ)


def _read_risk_or_readmission(
    user: CurrentUser = Depends(get_current_active_user),
) -> CurrentUser:
    """Allow a caller who can read either flavour of prediction.

    /predict and /high-risk stay Doctor+System Admin only (RISK_REPORT_READ);
    this wider guard exists only for the two /{patient_id} read routes below,
    since POST /readmission is reachable by Hospital Administrators too
    (READMISSION_FORECAST_READ) and they must be able to read back what they
    just created.
    """
    if not (
        has_permission(user.role, Permission.RISK_REPORT_READ)
        or has_permission(user.role, Permission.READMISSION_FORECAST_READ)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user.role}' lacks permission to read predictions",
        )
    return user


def _patient_not_found(patient_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No patient with id {patient_id}"
    )


def _admission_not_found(admission_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No admission with id {admission_id}",
    )


def _insufficient_data(exc: InsufficientPatientDataError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "error": "insufficient_patient_data",
            "missing_fields": exc.missing_fields,
        },
    )


def _model_not_available(exc: ModelNotAvailableError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"No production model is registered for '{exc.model_name}' yet.",
    )


def _no_prediction(patient_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No prediction exists yet for patient {patient_id}. Call POST /risk/predict first.",
    )


@router.post("/predict", response_model=RiskPredictionRead, summary="Score a patient's risk")
def predict_risk(
    payload: RiskPredictionRequest,
    user: CurrentUser = Depends(_read_risk),
    db: Session = Depends(get_db),
) -> RiskPredictionRead:
    """Score a patient's general risk and persist the result."""
    try:
        record = RiskService(db).score_patient(user, payload.patient_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(payload.patient_id) from exc
    except InsufficientPatientDataError as exc:
        raise _insufficient_data(exc) from exc
    except ModelNotAvailableError as exc:
        raise _model_not_available(exc) from exc
    return RiskPredictionRead.model_validate(record)


@router.post(
    "/readmission",
    response_model=RiskPredictionRead,
    summary="Forecast 30-day readmission for one admission",
)
def predict_readmission(
    payload: ReadmissionPredictionRequest,
    user: CurrentUser = Depends(_read_readmission),
    db: Session = Depends(get_db),
) -> RiskPredictionRead:
    """Forecast whether an admission will be followed by a 30-day readmission."""
    try:
        record = ReadmissionService(db).predict(user, payload.patient_id, payload.admission_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(payload.patient_id) from exc
    except AdmissionNotFoundError as exc:
        raise _admission_not_found(payload.admission_id) from exc
    except InsufficientPatientDataError as exc:
        raise _insufficient_data(exc) from exc
    except ModelNotAvailableError as exc:
        raise _model_not_available(exc) from exc
    return RiskPredictionRead.model_validate(record)


@router.get(
    "/high-risk",
    response_model=list[RiskPredictionRead],
    summary="List patients currently in the high risk band",
)
def list_high_risk_patients(
    user: CurrentUser = Depends(_read_risk),
    db: Session = Depends(get_db),
) -> list[RiskPredictionRead]:
    """Return each visible patient's latest prediction, filtered to High risk."""
    records = RiskService(db).list_high_risk(user)
    return [RiskPredictionRead.model_validate(record) for record in records]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    user: CurrentUser = Depends(_read_readmission),
    db: Session = Depends(get_db),
) -> ReadmissionForecast:
    """Return an aggregated 30-day readmission forecast, scoped to the caller."""
    summary = ReadmissionService(db).forecast_summary(user)
    return ReadmissionForecast.model_validate(summary)


@router.get(
    "/{patient_id}",
    response_model=RiskPredictionRead,
    summary="Most recent prediction of one type for a patient",
)
def get_latest_risk(
    patient_id: int,
    type: str = Query(default="risk", pattern="^(risk|readmission)$"),  # noqa: A002
    user: CurrentUser = Depends(_read_risk_or_readmission),
    db: Session = Depends(get_db),
) -> RiskPredictionRead:
    """Return a patient's most recent risk score (default) or readmission forecast."""
    try:
        record = RiskService(db).latest(user, patient_id, prediction_type=type)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    except NoPredictionError as exc:
        raise _no_prediction(patient_id) from exc
    return RiskPredictionRead.model_validate(record)


@router.get(
    "/{patient_id}/history",
    response_model=list[RiskPredictionRead],
    summary="Prediction trend of one type for a patient",
)
def get_risk_history(
    patient_id: int,
    type: str = Query(default="risk", pattern="^(risk|readmission)$"),  # noqa: A002
    user: CurrentUser = Depends(_read_risk_or_readmission),
    db: Session = Depends(get_db),
) -> list[RiskPredictionRead]:
    """Return a patient's risk-score (default) or readmission-forecast history."""
    try:
        records = RiskService(db).history(user, patient_id, prediction_type=type)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    return [RiskPredictionRead.model_validate(record) for record in records]
