"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import risk_service

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Run the trained model on one admission, persist it, and return the result."""
    record = risk_service.score_and_save(db, payload)
    return RiskPredictionRead.model_validate(record)


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> list[RiskPredictionRead]:
    """Return the current high risk cohort, scoped to the caller's role."""
    records = risk_service.get_high_risk_patients(db, user)
    return [RiskPredictionRead.model_validate(r) for r in records]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = 30,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    result = risk_service.get_readmission_forecast(db, horizon_days)
    return ReadmissionForecast(**result)


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
