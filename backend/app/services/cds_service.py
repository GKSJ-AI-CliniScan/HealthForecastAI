"""Clinical decision support: care recommendations and discharge planning.

Recommendations come from the risk drivers the model reports for the patient,
never from the score alone, and are decision SUPPORT for a clinician to review.
"""

from __future__ import annotations

from app.services import model_service
from app.services.patient_service import PatientRecord
from app.services.risk_service import RISK_HIGH, RISK_MEDIUM, score_patient

ADVICE = {
    "time_in_hospital": "Review whether a long stay reflects an unresolved problem before discharge.",
    "num_medications": "Run a medication reconciliation and simplify the regimen where possible.",
    "num_lab_procedures": "Check that abnormal lab results have a documented follow-up plan.",
    "number_diagnoses": "Arrange a care plan that covers every active diagnosis, not just the main one.",
    "number_inpatient": "Enrol in a transitional care programme: repeat admissions are a strong risk.",
    "number_emergency": "Give a written action plan and a direct contact for early symptoms.",
    "age_group": "Check mobility, home support and who will help after discharge.",
}
FOLLOW_UP_DAYS = {RISK_HIGH: 3, RISK_MEDIUM: 7}
DEFAULT_FOLLOW_UP_DAYS = 14


def recommendations(patient: PatientRecord) -> dict[str, object]:
    """Care and follow-up recommendations for one patient."""
    scored = score_patient(patient)
    drivers = model_service.explain(patient.features())
    items = [ADVICE[d.feature] for d in drivers]
    if scored.category == RISK_HIGH:
        items.insert(0, "Book a follow-up visit within 72 hours of discharge.")
    return {
        "patient_id": patient.id,
        "risk_category": scored.category,
        "readmission_probability": scored.probability,
        "drivers": [
            {"feature": d.label, "value": d.value, "effect": d.contribution} for d in drivers
        ],
        "recommendations": items or ["Routine follow-up. No elevated risk drivers found."],
        "follow_up_days": FOLLOW_UP_DAYS.get(scored.category, DEFAULT_FOLLOW_UP_DAYS),
    }


def discharge_plan(patient: PatientRecord) -> dict[str, object]:
    """Discharge readiness and risk mitigation steps for one patient."""
    scored = score_patient(patient)
    mitigation = ["Give the patient written discharge instructions and a medication list."]
    ready = True
    if scored.category == RISK_HIGH:
        ready = patient.recovery_score >= 60
        mitigation += [
            "Arrange a nurse phone call within 48 hours.",
            "Confirm transport and a caregiver at home.",
        ]
        if not ready:
            mitigation.append("Recovery score is low: reassess before discharge.")
    elif scored.category == RISK_MEDIUM:
        mitigation.append("Schedule a clinic visit within 7 days.")
    return {
        "patient_id": patient.id,
        "risk_category": scored.category,
        "recovery_score": patient.recovery_score,
        "ready_for_discharge": ready,
        "risk_mitigation": mitigation,
    }
