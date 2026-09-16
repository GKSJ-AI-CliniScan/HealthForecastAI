"""Risk scoring helpers shared by the API and the batch jobs."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.patient import Patient
from app.schemas.prediction import RiskPredictionRequest
from app.services import model_service

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


def score_admission(db: Session, request: RiskPredictionRequest) -> float:
    """Score one admission and return the raw readmission probability.

    The trained pipeline expects race/gender/age alongside the clinical
    fields on RiskPredictionRequest (see ml/configs/config.yaml). Rather than
    ask the caller to repeat demographics the system already has, this looks
    the patient up by id and fills them in.

    Raises:
        ValueError: no patient with that id exists.
        model_service.ModelNotAvailableError: no trained artifact yet.
    """
    patient = db.get(Patient, request.patient_id)
    if patient is None:
        raise ValueError(f"No patient with id {request.patient_id}")

    features = {
        "race": patient.race,
        "gender": patient.gender,
        "age": request.age_group or patient.age_group,
        "time_in_hospital": request.time_in_hospital,
        "num_lab_procedures": request.num_lab_procedures,
        "num_medications": request.num_medications,
        "number_diagnoses": request.number_diagnoses,
        "number_inpatient": request.number_inpatient,
        "number_emergency": request.number_emergency,
    }
    return model_service.predict_one(features)
