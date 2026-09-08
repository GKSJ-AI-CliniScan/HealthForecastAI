"""Risk scoring: banding, real-time prediction, and stored-prediction queries.

Milestone 2.

A note on partial input. The promoted model was fitted on the full encounter
record - roughly 40 columns. A real-time request carries far fewer. Rather than
refuse, we build a full-width frame and leave the unknown columns empty so the
pipeline's fitted imputers fill them with the training medians and modes. That
is standard for partial-input serving, but it genuinely weakens the prediction,
so every response reports how many features were actually supplied. Batch scores
written by `ml/src/models/score.py` use the complete record and are the ones the
dashboards show.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.user import User
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


def build_feature_frame(
    supplied: dict[str, Any], feature_columns: list[str]
) -> tuple[pd.DataFrame, int]:
    """Return a one-row frame shaped like the training data, plus a coverage count.

    Columns the caller did not supply are left as None so the pipeline's fitted
    imputers fill them. The count is what the response reports as coverage.
    """
    row: dict[str, Any] = dict.fromkeys(feature_columns)

    matched = 0
    for key, value in supplied.items():
        if value is None:
            continue
        if key in row:
            row[key] = value
            matched += 1

    return pd.DataFrame([row], columns=feature_columns), matched


def predict_one(supplied: dict[str, Any]) -> dict[str, Any] | None:
    """Score a single encounter. Returns None when no model is loaded."""
    model = model_service.load_model()
    if model is None:
        return None

    frame, supplied_count = build_feature_frame(supplied, model.feature_columns)
    probability = float(model.predict_proba(frame)[0])

    return {
        "readmission_probability": round(probability, 6),
        "risk_category": categorise_risk(probability),
        "flagged": probability >= model.decision_threshold,
        "decision_threshold": model.decision_threshold,
        "model_name": model.model_name,
        "model_version": model.model_version,
        "features_supplied": supplied_count,
        "features_expected": len(model.feature_columns),
    }


def explain(limit: int = 10) -> list[dict[str, Any]]:
    """Return the model's strongest drivers, for the clinical insights module."""
    model = model_service.load_model()
    if model is None:
        return []
    return model.top_drivers[:limit]


def store_prediction(
    db: Session,
    patient_id: int,
    probability: float,
    model_name: str,
    model_version: str,
    admission_id: int | None = None,
) -> RiskPrediction:
    """Persist one prediction so it can be listed and trended later."""
    prediction = RiskPrediction(
        patient_id=patient_id,
        admission_id=admission_id,
        readmission_probability=probability,
        risk_category=categorise_risk(probability),
        model_name=model_name,
        model_version=model_version,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def _latest_prediction_subquery():
    """Subquery giving the most recent prediction id per patient."""
    return (
        select(
            RiskPrediction.patient_id,
            func.max(RiskPrediction.id).label("latest_id"),
        )
        .group_by(RiskPrediction.patient_id)
        .subquery()
    )


def latest_for_patient(db: Session, patient_id: int) -> RiskPrediction | None:
    """Return the most recent stored prediction for one patient."""
    stmt = (
        select(RiskPrediction)
        .where(RiskPrediction.patient_id == patient_id)
        .order_by(RiskPrediction.id.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def high_risk_cohort(
    db: Session,
    actor: User,
    category: str = RISK_HIGH,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """Return the current high risk cohort, scoped to what the caller may see."""
    latest = _latest_prediction_subquery()

    base = (
        select(RiskPrediction, Patient)
        .join(latest, RiskPrediction.id == latest.c.latest_id)
        .join(Patient, Patient.id == RiskPrediction.patient_id)
        .where(RiskPrediction.risk_category == category)
    )

    if actor.role == Role.DOCTOR:
        base = base.where(Patient.assigned_doctor_id == actor.id)

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()

    rows = db.execute(
        base.order_by(RiskPrediction.readmission_probability.desc()).limit(limit).offset(offset)
    ).all()

    cohort = [
        {
            "patient_id": patient.id,
            "medical_record_number": patient.medical_record_number,
            "age_group": patient.age_group,
            "gender": patient.gender,
            "primary_diagnosis": patient.primary_diagnosis,
            "readmission_probability": round(float(prediction.readmission_probability), 4),
            "risk_category": prediction.risk_category,
            "model_version": prediction.model_version,
        }
        for prediction, patient in rows
    ]
    return cohort, total


def risk_distribution(db: Session, actor: User) -> dict[str, int]:
    """Return how many patients sit in each risk band, scoped to the caller."""
    latest = _latest_prediction_subquery()

    stmt = (
        select(RiskPrediction.risk_category, func.count(RiskPrediction.id))
        .join(latest, RiskPrediction.id == latest.c.latest_id)
        .join(Patient, Patient.id == RiskPrediction.patient_id)
        .group_by(RiskPrediction.risk_category)
    )
    if actor.role == Role.DOCTOR:
        stmt = stmt.where(Patient.assigned_doctor_id == actor.id)

    counts = dict.fromkeys((RISK_LOW, RISK_MEDIUM, RISK_HIGH), 0)
    for category, count in db.execute(stmt):
        counts[category] = count
    return counts


def forecast(db: Session, actor: User, horizon_days: int = 30) -> dict[str, Any]:
    """Forecast readmissions over a horizon from the stored predictions.

    The expected count is the sum of the individual probabilities rather than a
    count of flagged patients. Summing probabilities is the unbiased estimate of
    how many events will occur; counting everyone above the threshold answers a
    different question - who to review - and overstates the total, because the
    threshold is deliberately set to catch borderline cases.
    """
    latest = _latest_prediction_subquery()

    stmt = (
        select(
            func.count(RiskPrediction.id),
            func.sum(cast(RiskPrediction.readmission_probability, Float)),
            func.avg(cast(RiskPrediction.readmission_probability, Float)),
        )
        .join(latest, RiskPrediction.id == latest.c.latest_id)
        .join(Patient, Patient.id == RiskPrediction.patient_id)
    )
    if actor.role == Role.DOCTOR:
        stmt = stmt.where(Patient.assigned_doctor_id == actor.id)

    scored, probability_sum, probability_mean = db.execute(stmt).one()
    scored = scored or 0
    probability_sum = float(probability_sum or 0.0)

    distribution = risk_distribution(db, actor)
    model = model_service.load_model()

    return {
        "scope": "caseload" if actor.role == Role.DOCTOR else "hospital",
        "horizon_days": horizon_days,
        "patients_scored": scored,
        "expected_readmissions": round(probability_sum, 1),
        "expected_rate": round(float(probability_mean or 0.0), 4),
        "risk_distribution": distribution,
        "model_version": model.model_version if model else None,
        "basis": "sum of per-patient probabilities from the latest stored prediction",
    }


def observed_vs_expected(db: Session) -> dict[str, Any]:
    """Compare the forecast against what the record actually shows.

    A forecast nobody checks is a number, not a workflow. This is the calibration
    view: how the predicted rate compares with the observed 30-day readmission
    rate over the same population.
    """
    latest = _latest_prediction_subquery()

    # PostgreSQL will not cast a boolean straight to a numeric type, so count the
    # readmissions with a CASE rather than summing the comparison.
    readmitted_flag = case((Admission.readmitted == "<30", 1), else_=0)

    stmt = (
        select(
            RiskPrediction.risk_category,
            func.count(RiskPrediction.id),
            func.avg(cast(RiskPrediction.readmission_probability, Float)),
            func.sum(readmitted_flag),
        )
        .join(latest, RiskPrediction.id == latest.c.latest_id)
        .join(Admission, Admission.patient_id == RiskPrediction.patient_id)
        .group_by(RiskPrediction.risk_category)
    )

    bands = []
    for category, count, mean_probability, observed in db.execute(stmt):
        count = count or 0
        observed = int(observed or 0)
        bands.append(
            {
                "risk_category": category,
                "patients": count,
                "predicted_rate": round(float(mean_probability or 0.0), 4),
                "observed_readmissions": observed,
                "observed_rate": round(observed / count, 4) if count else 0.0,
            }
        )

    order = {RISK_HIGH: 0, RISK_MEDIUM: 1, RISK_LOW: 2}
    bands.sort(key=lambda item: order.get(str(item["risk_category"]), 9))
    return {"bands": bands}
