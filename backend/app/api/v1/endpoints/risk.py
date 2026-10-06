"""Risk prediction and readmission forecasting endpoints - Module 3."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.config import settings
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import model_service
from app.services.patient_service import get_patients_for_user
from app.services.risk_service import save_prediction

router = APIRouter()


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.RISK_REPORT_READ)),
) -> RiskPredictionRead:
    """Return the readmission probability and risk band for one admission."""
    patient = db.get(Patient, payload.patient_id)
    admission = (
        db.query(Admission)
        .filter(Admission.patient_id == payload.patient_id)
        .order_by(Admission.id.desc())
        .first()
    )
    if patient is None or admission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient or admission not found"
        )

    try:
        probability = model_service.predict_probability(patient, admission)
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Risk prediction model unavailable: {str(exc)}",
        ) from exc

    prediction = save_prediction(
        db, payload.patient_id, probability, settings.ACTIVE_RISK_MODEL, "1.0.0"
    )
    return RiskPredictionRead.model_validate(prediction)


@router.get(
    "/high-risk", response_model=list[RiskPredictionRead], summary="List high risk patients"
)
def list_high_risk_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[RiskPredictionRead]:
    """Return all high risk predictions scoped to the user's patient visibility."""
    visible_patients = get_patients_for_user(db, user)
    patient_ids = [p.id for p in visible_patients]

    if not patient_ids:
        return []

    predictions = (
        db.query(RiskPrediction)
        .filter(
            RiskPrediction.patient_id.in_(patient_ids),
            RiskPrediction.risk_category == "high",
        )
        .order_by(RiskPrediction.created_at.desc())
        .all()
    )
    return [RiskPredictionRead.model_validate(p) for p in predictions]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = 30,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.READMISSION_FORECAST_READ)),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    visible_patients = get_patients_for_user(db, user)
    patient_ids = [p.id for p in visible_patients]
    scope = "assigned" if user.role is Role.DOCTOR else "hospital"

    if not patient_ids:
        return ReadmissionForecast(
            scope=scope,
            horizon_days=horizon_days,
            predicted_readmissions=0,
            predicted_rate=0.0,
        )

    cutoff = datetime.now(UTC) - timedelta(days=horizon_days)
    recent_predictions = (
        db.query(RiskPrediction)
        .filter(
            RiskPrediction.patient_id.in_(patient_ids),
            RiskPrediction.created_at >= cutoff,
        )
        .all()
    )

    total = len(recent_predictions)
    if total == 0:
        return ReadmissionForecast(
            scope=scope,
            horizon_days=horizon_days,
            predicted_readmissions=0,
            predicted_rate=0.0,
        )

    high_risk = sum(1 for p in recent_predictions if p.risk_category == "high")
    rate = round(high_risk / total, 4)

    return ReadmissionForecast(
        scope=scope,
        horizon_days=horizon_days,
        predicted_readmissions=high_risk,
        predicted_rate=rate,
    )
