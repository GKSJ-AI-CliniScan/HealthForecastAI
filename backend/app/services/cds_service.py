"""Clinical Decision Support (CDS) service - care recommendations and discharge readiness."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome


def generate_care_recommendations(db: Session, patient_id: int) -> dict[str, Any]:
    """Generate risk-informed clinical care recommendations."""
    patient = db.get(Patient, patient_id)
    if not patient:
        return {
            "patient_id": patient_id,
            "recommendations": [],
            "follow_up_days": None,
            "error": "Patient not found",
        }

    # Retrieve latest risk prediction
    latest_pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.patient_id == patient_id)
        .order_by(RiskPrediction.id.desc())
        .first()
    )

    risk_category = latest_pred.risk_category if latest_pred else "low"

    recommendations: list[str] = []
    if risk_category == "high":
        recommendations.append("Schedule urgent outpatient follow-up within 7 days.")
        recommendations.append("Conduct clinical medication reconciliation to stabilize regimen.")
        recommendations.append("Enroll patient into proactive post-discharge monitoring program.")
        follow_up_days = 7
    elif risk_category == "medium":
        recommendations.append("Schedule routine follow-up visit within 14 days.")
        recommendations.append("Provide structured diabetes self-management guide.")
        follow_up_days = 14
    else:
        recommendations.append("Standard follow-up at 30 days post-discharge.")
        follow_up_days = 30

    if patient.primary_diagnosis:
        recommendations.append(
            f"Review treatment pathway for diagnosis: {patient.primary_diagnosis}."
        )

    return {
        "patient_id": patient_id,
        "risk_category": risk_category,
        "recommendations": recommendations,
        "follow_up_days": follow_up_days,
    }


def generate_discharge_plan(db: Session, patient_id: int) -> dict[str, Any]:
    """Assess patient discharge readiness and generate mitigation steps."""
    patient = db.get(Patient, patient_id)
    if not patient:
        return {
            "patient_id": patient_id,
            "risk_mitigation": [],
            "ready_for_discharge": False,
            "error": "Patient not found",
        }

    latest_adm = (
        db.query(Admission)
        .filter(Admission.patient_id == patient_id)
        .order_by(Admission.id.desc())
        .first()
    )

    latest_pred = (
        db.query(RiskPrediction)
        .filter(RiskPrediction.patient_id == patient_id)
        .order_by(RiskPrediction.id.desc())
        .first()
    )

    treatment = (
        db.query(TreatmentOutcome)
        .filter(TreatmentOutcome.admission_id == (latest_adm.id if latest_adm else 0))
        .first()
    )

    recovery = treatment.recovery_score if treatment else 75.0
    risk = latest_pred.risk_category if latest_pred else "low"

    # Discharge readiness logic
    ready = recovery >= 60.0 and risk != "high"
    readiness_score = round(float(recovery * (0.6 if risk == "high" else 1.0)), 2)

    mitigations: list[str] = []
    if risk == "high":
        mitigations.append("Arrange home health nurse visit within 48 hours.")
        mitigations.append("Ensure 30-day medication supply is pre-authorized.")
    if treatment and treatment.medication_change:
        mitigations.append("Educate patient on recent medication dosage modifications.")
    mitigations.append("Ensure patient has contact number for rapid clinical triage.")

    return {
        "patient_id": patient_id,
        "ready_for_discharge": ready,
        "readiness_score": readiness_score,
        "risk_mitigation": mitigations,
    }
