"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission, Role
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import model_service, patient_service, risk_service

router = APIRouter()


def _prediction(patient_id: int, probability: float) -> RiskPredictionRead:
    info = model_service.active_model_info()
    return RiskPredictionRead(
        patient_id=patient_id,
        readmission_probability=probability,
        risk_category=risk_service.categorise_risk(probability),
        model_name=info["name"],
        model_version=info["version"],
    )


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Return the readmission probability and risk band for one admission."""
    features = payload.model_dump(exclude={"patient_id"})
    return _prediction(payload.patient_id, model_service.predict_probability(features))


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the caller's high risk cohort (a doctor sees only their own patients)."""
    return [_prediction(s.patient.id, s.probability) for s in risk_service.high_risk_cohort(user)]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = Query(default=30, ge=1, le=90),
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    patients = patient_service.visible_patients(user)
    count, rate = risk_service.forecast(patients, horizon_days)
    return ReadmissionForecast(
        scope="my-patients" if user.role is Role.DOCTOR else "hospital",
        horizon_days=horizon_days,
        predicted_readmissions=count,
        predicted_rate=rate,
    )


@router.get("/forecast/departments", summary="Readmission forecast per department")
def forecast_by_department(
    horizon_days: int = Query(default=30, ge=1, le=90),
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> list[dict]:
    """Return the forecast split by department, highest predicted rate first."""
    patients = patient_service.visible_patients(user)
    return risk_service.forecast_by_department(patients, horizon_days)
