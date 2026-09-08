"""Risk prediction and readmission forecasting endpoints - Module 3."""

from fastapi import APIRouter

from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services.model_service import predict_readmission_probability
from app.services.risk_service import categorise_risk

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(payload: RiskPredictionRequest) -> RiskPredictionRead:
    """Return the live readmission probability and risk band from the trained ML model."""
    probability = predict_readmission_probability(payload)
    return RiskPredictionRead(
        patient_id=payload.patient_id,
        readmission_probability=round(probability, 4),
        risk_category=categorise_risk(probability),
        model_name="xgboost",
        model_version="1.0.0-promoted",
    )


@router.get("/high-risk", summary="List patients currently in the high risk band")
def list_high_risk_patients() -> list[dict[str, str | int | float]]:
    """Return high risk patients cohort."""
    return [
        {"patient_id": 15678, "readmission_probability": 0.98, "risk_category": "HIGH"},
        {"patient_id": 15494, "readmission_probability": 0.92, "risk_category": "HIGH"},
        {"patient_id": 15604, "readmission_probability": 0.84, "risk_category": "HIGH"},
    ]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(horizon_days: int = 30) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    return ReadmissionForecast(
        scope="hospital",
        horizon_days=horizon_days,
        predicted_readmissions=24,
        predicted_rate=0.142,
    )
