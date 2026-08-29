"""Risk scoring: banding, persistence and role-scoped retrieval.

The banding helper is shared with the ML side (ml/src/evaluation/metrics.py) and
the two are held to the same thresholds by ml/tests/test_metrics.py. Changing a
boundary here without changing it there will fail that test, which is the point.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.api.deps import VerifiedUser
from app.core.config import settings
from app.core.rbac import Role
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.services import model_service

RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"


class PatientOutOfScopeError(Exception):
    """Raised when a caller scores or reads a patient they may not see."""


def categorise_risk(probability: float) -> str:
    """Map a readmission probability onto the platform's three risk bands."""
    if not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be between 0.0 and 1.0")
    if probability >= settings.RISK_THRESHOLD_HIGH:
        return RISK_HIGH
    if probability >= settings.RISK_THRESHOLD_MEDIUM:
        return RISK_MEDIUM
    return RISK_LOW


def scope_patient_ids(db: Session, caller: VerifiedUser) -> list[int]:
    """Return the patient ids the caller is allowed to see."""
    query: Query[Any] = db.query(Patient.id)
    if caller.role is Role.DOCTOR:
        query = query.filter(Patient.assigned_doctor_id == caller.id)
    return [row.id for row in query.all()]


def assert_patient_in_scope(db: Session, caller: VerifiedUser, patient_id: int) -> Patient:
    """Return the patient, or raise when it is missing or out of the caller's scope.

    Out-of-scope and missing are deliberately the same error. Telling a doctor
    that a patient exists but belongs to another ward is itself a disclosure.
    """
    query = db.query(Patient).filter(Patient.id == patient_id)
    if caller.role is Role.DOCTOR:
        query = query.filter(Patient.assigned_doctor_id == caller.id)
    patient = query.one_or_none()
    if patient is None:
        raise PatientOutOfScopeError(f"No patient with id {patient_id} in your scope")
    return patient


def score_admission(db: Session, caller: VerifiedUser, payload: dict[str, Any]) -> RiskPrediction:
    """Score one admission and store the result.

    The prediction is persisted so that the high-risk cohort and the forecast
    read the same numbers a clinician was shown, rather than re-scoring and
    possibly disagreeing with what is on screen.
    """
    patient = assert_patient_in_scope(db, caller, int(payload["patient_id"]))

    probability = model_service.predict_probability(payload)
    prediction = RiskPrediction(
        patient_id=patient.id,
        readmission_probability=probability,
        risk_category=categorise_risk(probability),
        model_name=settings.ACTIVE_RISK_MODEL,
        model_version=model_service.model_version(),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def latest_predictions(
    db: Session, caller: VerifiedUser, category: str | None = None, limit: int = 50
) -> list[RiskPrediction]:
    """Return stored predictions the caller may see, newest first."""
    query = db.query(RiskPrediction)
    if caller.role is Role.DOCTOR:
        visible = scope_patient_ids(db, caller)
        query = query.filter(RiskPrediction.patient_id.in_(visible or [-1]))
    if category is not None:
        query = query.filter(RiskPrediction.risk_category == category)
    return query.order_by(RiskPrediction.id.desc()).limit(limit).all()


def forecast(db: Session, caller: VerifiedUser, horizon_days: int) -> dict[str, Any]:
    """Aggregate stored predictions into a readmission forecast.

    The expected count is the sum of the probabilities rather than a count of
    patients over the high threshold: ten patients at 0.30 produce about three
    readmissions between them, and a threshold count would report zero.
    """
    query = db.query(RiskPrediction)
    if caller.role is Role.DOCTOR:
        visible = scope_patient_ids(db, caller)
        query = query.filter(RiskPrediction.patient_id.in_(visible or [-1]))

    scored = query.count()
    if scored == 0:
        return {
            "scope": "assigned" if caller.role is Role.DOCTOR else "hospital",
            "horizon_days": horizon_days,
            "predicted_readmissions": 0,
            "predicted_rate": 0.0,
            "patients_scored": 0,
        }

    total = query.with_entities(func.sum(RiskPrediction.readmission_probability)).scalar() or 0.0
    rate = float(total) / scored

    return {
        "scope": "assigned" if caller.role is Role.DOCTOR else "hospital",
        "horizon_days": horizon_days,
        "predicted_readmissions": round(float(total)),
        "predicted_rate": round(min(max(rate, 0.0), 1.0), 4),
        "patients_scored": scored,
    }
