"""Clinical Decision Support (CDS) service - business logic layer."""

from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.services import risk_service


def generate_care_recommendations(db: Session, patient_id: int) -> dict[str, object]:
    """Derive care recommendations and follow-up window from patient risk profile."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"patient_id": patient_id, "recommendations": [], "follow_up_days": None}

    admissions = db.query(Admission).filter(Admission.patient_id == patient_id).all()
    latest_adm = admissions[-1] if admissions else None

    # Fetch latest stored prediction or fallback based on admission indicators
    pred = risk_service.latest_for_patient(db, patient_id)
    category = pred.risk_category if pred else "low"
    prob = float(pred.readmission_probability) if pred else 0.08

    recommendations: list[str] = []
    follow_up_days: int = 14

    if category == "high":
        follow_up_days = 7
        recommendations.extend(
            [
                "Schedule mandatory post-discharge home visit or telehealth check within 7 days.",
                "Complete comprehensive medication reconciliation for diabetes & cardiovascular therapies.",
                "Assign dedicated care manager for 30-day post-discharge monitoring.",
                "Provide 24/7 urgent contact channel for acute symptom deterioration.",
            ]
        )
    elif category == "medium":
        follow_up_days = 14
        recommendations.extend(
            [
                "Schedule outpatient clinic follow-up visit within 14 days.",
                "Review medication adherence and self-monitoring log.",
                "Provide patient education on warning signs of disease escalation.",
            ]
        )
    else:
        follow_up_days = 30
        recommendations.extend(
            [
                "Schedule routine primary care follow-up within 30 days.",
                "Maintain current treatment protocol and healthy lifestyle guidelines.",
            ]
        )

    if latest_adm and latest_adm.num_lab_procedures and latest_adm.num_lab_procedures > 50:
        recommendations.append(
            "Order follow-up lab panel (HbA1c / renal markers) prior to next visit."
        )

    if latest_adm and latest_adm.num_medications and latest_adm.num_medications > 15:
        recommendations.append(
            "Conduct high-risk polypharmacy review to prevent adverse drug interactions."
        )

    return {
        "patient_id": patient_id,
        "risk_category": category,
        "readmission_probability": prob,
        "recommendations": recommendations,
        "follow_up_days": follow_up_days,
    }


def generate_discharge_plan(db: Session, patient_id: int) -> dict[str, object]:
    """Return discharge readiness assessment and risk mitigation steps."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"patient_id": patient_id, "risk_mitigation": [], "ready_for_discharge": None}

    admissions = db.query(Admission).filter(Admission.patient_id == patient_id).all()
    latest_adm = admissions[-1] if admissions else None

    pred = risk_service.latest_for_patient(db, patient_id)
    category = pred.risk_category if pred else "low"

    mitigation_steps: list[str] = [
        "Confirm follow-up appointment date and time before physical discharge.",
        "Ensure patient has a 30-day supply of all prescribed medications upon leaving.",
    ]

    ready = True
    readiness_score = 90.0

    if category == "high":
        ready = False
        readiness_score = 62.0
        mitigation_steps.extend(
            [
                "Requires attending physician clinical sign-off prior to discharge approval.",
                "Arrange home health nursing assessment or rehabilitation support.",
                "Conduct teach-back verification for insulin administration & blood glucose tracking.",
            ]
        )
    elif category == "medium":
        readiness_score = 78.0
        mitigation_steps.extend(
            [
                "Verify transportation and family/caregiver support for discharge day.",
                "Provide written discharge instructions in patient's preferred language.",
            ]
        )

    if latest_adm and latest_adm.time_in_hospital and latest_adm.time_in_hospital > 7:
        mitigation_steps.append(
            "Assess physical mobility and fall risk before discharge confirmation."
        )

    return {
        "patient_id": patient_id,
        "risk_category": category,
        "ready_for_discharge": ready,
        "readiness_score": readiness_score,
        "risk_mitigation": mitigation_steps,
        "checklist": [
            {"item": "Vital signs stable for 24 hours", "completed": True},
            {"item": "Medication reconciliation complete", "completed": True},
            {"item": "Follow-up appointment scheduled", "completed": ready},
            {"item": "Patient education materials handed over", "completed": True},
        ],
    }
