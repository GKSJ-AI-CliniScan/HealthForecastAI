"""Risk scoring helpers shared by the API and the batch jobs."""

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.rbac import Role
from app.models.prediction import RiskPrediction
from app.schemas.prediction import RiskPredictionRequest
from app.services.model_service import MODEL_VERSION, predict_readmission

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


def score_and_save(db: Session, payload: RiskPredictionRequest) -> RiskPrediction:
    """Run the model, categorise the result, and persist it."""
    probability = predict_readmission(
        time_in_hospital=payload.time_in_hospital,
        num_medications=payload.num_medications,
        num_lab_procedures=payload.num_lab_procedures,
        number_diagnoses=payload.number_diagnoses,
        number_inpatient=payload.number_inpatient,
        number_emergency=payload.number_emergency,
        age_group=payload.age_group,
    )

    record = RiskPrediction(
        patient_id=payload.patient_id,
        readmission_probability=probability,
        risk_category=categorise_risk(probability),
        model_name=settings.ACTIVE_RISK_MODEL,
        model_version=MODEL_VERSION,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _latest_predictions(db: Session):
    """Subquery-joined query: each patient's single most recent prediction."""
    from sqlalchemy import func

    latest_ids = (
        db.query(
            RiskPrediction.patient_id,
            func.max(RiskPrediction.created_at).label("latest"),
        )
        .group_by(RiskPrediction.patient_id)
        .subquery()
    )
    return db.query(RiskPrediction).join(
        latest_ids,
        (RiskPrediction.patient_id == latest_ids.c.patient_id)
        & (RiskPrediction.created_at == latest_ids.c.latest),
    )


def get_high_risk_patients(db: Session, user: CurrentUser) -> list[RiskPrediction]:
    """Return each patient's most recent prediction, filtered to 'high', scoped by role."""
    query = _latest_predictions(db).filter(RiskPrediction.risk_category == RISK_HIGH)

    if user.role is Role.DOCTOR:
        from app.models.patient import Patient

        query = query.join(Patient, Patient.id == RiskPrediction.patient_id).filter(
            Patient.assigned_doctor_id == int(user.subject)
        )
    # hospital_admin / system_admin: no extra filter (hospital-wide / full access)
    # researcher: shouldn't hit this endpoint at all — same pattern as /patients

    return query.order_by(RiskPrediction.readmission_probability.desc()).all()


def get_readmission_forecast(db: Session, horizon_days: int) -> dict:
    """Project expected readmissions from each patient's latest 30-day score.

    The model predicts a 30-day readmission probability, so a horizon other
    than 30 days is a linear scale of that base rate - a simplification,
    not a true time-series forecast. Documented as a known limitation.
    """
    records = _latest_predictions(db).all()
    total_scored = len(records)

    if total_scored == 0:
        return {
            "scope": "hospital",
            "horizon_days": horizon_days,
            "predicted_readmissions": 0,
            "predicted_rate": 0.0,
        }

    base_rate_30d = sum(r.readmission_probability for r in records) / total_scored
    scaling_factor = horizon_days / 30
    predicted_rate = min(base_rate_30d * scaling_factor, 1.0)
    predicted_readmissions = round(predicted_rate * total_scored)

    return {
        "scope": "hospital",
        "horizon_days": horizon_days,
        "predicted_readmissions": predicted_readmissions,
        "predicted_rate": round(predicted_rate, 4),
    }
