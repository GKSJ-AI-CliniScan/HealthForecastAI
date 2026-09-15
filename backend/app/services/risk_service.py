"""Risk scoring helpers shared by the API and the batch jobs."""

from sqlalchemy.orm import Session

from app.core.config import settings
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


def save_prediction(
    db: Session, patient_id: int, probability: float, model_name: str, model_version: str
) -> RiskPrediction:
    """Persist a model prediction into PostgreSQL."""
    prediction = RiskPrediction(
        patient_id=patient_id,
        readmission_probability=probability,
        risk_category=categorise_risk(probability),
        model_name=model_name,
        model_version=model_version,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction
