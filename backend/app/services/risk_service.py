"""Risk scoring helpers shared by the API and the batch jobs."""

from datetime import datetime, timedelta, timezone

from app.core.config import settings

from sqlalchemy.orm import Session

from app.api.deps import VerifiedUser
from app.core.rbac import Role
from app.models.patient import Patient
from app.models.prediction import RiskPrediction


RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"


def categorise_risk(probability: float) -> str:
    """Map a readmission probability onto the platform's three risk bands."""
    if not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be between 0.0 and 1.0")
    if probability >= settings.RISK_THRESHOLD_HIGH:
        return RISK_HIGH
    if probability >= settings.RISK_THRESHOLD_MEDIUM:
        return RISK_MEDIUM
    return RISK_LOW

def list_high_risk_predictions(
    db: Session, caller: VerifiedUser
) -> list[RiskPrediction]:
    """Return high-risk predictions visible to the caller."""

    query = (
        db.query(RiskPrediction)
        .join(Patient, RiskPrediction.patient_id == Patient.id)
        .filter(RiskPrediction.risk_category == RISK_HIGH)
    )

    if caller.role is Role.DOCTOR:
        query = query.filter(Patient.assigned_doctor_id == caller.id)

    return query.order_by(RiskPrediction.created_at.desc()).all()

def get_readmission_forecast(
    db: Session, caller: VerifiedUser, horizon_days: int
) -> tuple[int, float]:
    """Aggregate stored predictions into a count and rate."""

    if horizon_days <= 0:
        raise ValueError("horizon_days must be greater than 0")

    cutoff = datetime.now(timezone.utc) - timedelta(days=horizon_days)

    query = (
        db.query(RiskPrediction)
        .join(Patient, RiskPrediction.patient_id == Patient.id)
        .filter(RiskPrediction.created_at >= cutoff)
    )

    if caller.role is Role.DOCTOR:
        query = query.filter(Patient.assigned_doctor_id == caller.id)

    predictions = query.all()

    total_predictions = len(predictions)
    if total_predictions == 0:
        return 0, 0.0

    high_risk_predictions = sum(
        prediction.risk_category == RISK_HIGH
        for prediction in predictions
    )

    predicted_rate = high_risk_predictions / total_predictions

    return high_risk_predictions, predicted_rate