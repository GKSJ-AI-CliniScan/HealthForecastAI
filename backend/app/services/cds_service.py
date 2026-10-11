"""Clinical Decision Support (CDS) service - business logic layer."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.user import User
from app.services import model_service, risk_service

UNSCORED_NOTE = "No readmission score is on record for this patient yet."


def generate_care_recommendations(
    db: Session, patient_id: int, persist: bool = True
) -> dict[str, object]:
    """Derive care recommendations and follow-up window from patient risk profile."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {
            "patient_id": patient_id,
            "recommendations": [],
            "follow_up_days": None,
            "clinical_insights": None,
        }

    admissions = db.query(Admission).filter(Admission.patient_id == patient_id).all()
    latest_adm = admissions[-1] if admissions else None

    # No fallback band. A patient with no stored prediction is unscored, not low
    # risk, and the pathways below have to say so rather than invent a plan.
    pred = risk_service.latest_for_patient(db, patient_id)
    category = pred.risk_category if pred else None
    prob = float(pred.readmission_probability) if pred else None

    recommendations: list[str] = []
    follow_up_days: int | None = _follow_up_days(category)

    if category == "high":
        recommendations.extend(
            [
                "Schedule mandatory post-discharge home visit or telehealth check within 7 days.",
                "Complete comprehensive medication reconciliation for diabetes & cardiovascular therapies.",
                "Assign dedicated care manager for 30-day post-discharge monitoring.",
                "Provide 24/7 urgent contact channel for acute symptom deterioration.",
            ]
        )
    elif category == "medium":
        recommendations.extend(
            [
                "Schedule outpatient clinic follow-up visit within 14 days.",
                "Review medication adherence and self-monitoring log.",
                "Provide patient education on warning signs of disease escalation.",
            ]
        )
    elif category == "low":
        recommendations.extend(
            [
                "Schedule routine primary care follow-up within 30 days.",
                "Maintain current treatment protocol and healthy lifestyle guidelines.",
            ]
        )
    else:
        recommendations.extend(
            [
                UNSCORED_NOTE,
                "Run batch or real-time readmission scoring for this patient, then review the "
                "generated pathway.",
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

    # Generate structured clinical insights for persistence
    clinical_insights = {
        "risk_mitigation": _generate_risk_mitigation(category, latest_adm),
        "care_recommendations": _generate_care_recommendations_text(recommendations),
        "follow_up_planning": _generate_follow_up_planning(category, follow_up_days),
        "discharge_recommendations": _generate_discharge_recommendations(category),
        "generated_at": datetime.now(UTC).isoformat(),
    }

    # Insights attach to the prediction row, so an unscored patient has nothing to
    # store them against and the text comes back unpersisted.
    if persist and pred is not None:
        pred.clinical_insights = clinical_insights
        db.commit()
        db.refresh(pred)

    return {
        "patient_id": patient_id,
        "risk_category": category,
        "readmission_probability": prob,
        "model_scored": pred is not None,
        "recommendations": recommendations,
        "follow_up_days": follow_up_days,
        "clinical_insights": clinical_insights,
        "persisted": persist and pred is not None,
    }


def _follow_up_days(category: str | None) -> int | None:
    """The follow-up window each risk band carries. Unscored has none."""
    windows: dict[str | None, int] = {"high": 7, "medium": 14, "low": 30}
    return windows.get(category)


def _generate_risk_mitigation(category: str | None, latest_adm: Admission | None) -> str:
    """Generate risk mitigation strategy text."""
    if category == "high":
        mitigation = "High-risk patient requiring intensive monitoring. "
        mitigation += (
            "Schedule mandatory post-discharge home visit or telehealth check within 7 days. "
        )
        mitigation += "Assign dedicated care manager for 30-day post-discharge monitoring. "
        mitigation += "Provide 24/7 urgent contact channel for acute symptom deterioration. "
        if latest_adm and latest_adm.num_medications and latest_adm.num_medications > 15:
            mitigation += "Conduct high-risk polypharmacy review. "
    elif category == "medium":
        mitigation = "Medium-risk patient requiring moderate monitoring. "
        mitigation += "Schedule outpatient clinic follow-up within 14 days. "
        mitigation += "Review medication adherence and self-monitoring log. "
    elif category == "low":
        mitigation = "Low-risk patient requiring standard monitoring. "
        mitigation += "Schedule routine primary care follow-up within 30 days. "
        mitigation += "Maintain current treatment protocol. "
    else:
        mitigation = (
            UNSCORED_NOTE
            + " No intensive or reduced monitoring pathway applies until a score exists. "
        )

    return mitigation


def _generate_care_recommendations_text(recommendations: list[str]) -> str:
    """Generate care and diet recommendations text."""
    if not recommendations:
        return "Standard post-admission recovery protocol recommended. "

    # Extract most relevant recommendations
    relevant = [
        r
        for r in recommendations
        if any(
            term in r.lower()
            for term in ["medication", "diet", "exercise", "follow-up", "schedule"]
        )
    ]
    return " ".join(relevant) if relevant else " ".join(recommendations)


def _generate_follow_up_planning(category: str | None, follow_up_days: int | None) -> str:
    """Generate follow-up action plan text."""
    if follow_up_days is None:
        return (
            UNSCORED_NOTE
            + " Follow-up interval is set once a readmission score and risk band exist."
        )
    priorities: dict[str | None, str] = {"high": "High priority", "medium": "Medium priority"}
    priority = priorities.get(category, "Standard priority")
    channel = (
        "Consider telehealth check-in" if category == "high" else "Standard office visit acceptable"
    )
    return (
        f"Schedule follow-up appointment within {follow_up_days} days. "
        f"{priority} monitoring recommended. "
        f"{channel}."
    )


def _generate_discharge_recommendations(category: str | None) -> str:
    """Generate discharge protocol text."""
    protocols: dict[str | None, str] = {
        "high": (
            "Requires attending physician clinical sign-off prior to discharge approval. "
            "Arrange home health nursing assessment or rehabilitation support. "
            "Conduct teach-back verification for insulin administration & blood glucose tracking. "
        ),
        "medium": (
            "Verify transportation and family/caregiver support for discharge day. "
            "Provide written discharge instructions in patient's preferred language. "
            "Confirm follow-up appointment before physical discharge. "
        ),
        "low": (
            "Routine discharge protocols applicable. "
            "Ensure 30-day supply of all prescribed medications upon leaving. "
            "Standard follow-up appointment scheduling required. "
        ),
    }
    return protocols.get(
        category,
        UNSCORED_NOTE
        + " Apply the unit's standard discharge protocol and record the score first. ",
    )


def generate_discharge_plan(
    db: Session, patient_id: int, persist: bool = True
) -> dict[str, object]:
    """Return discharge readiness assessment and risk mitigation steps."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {
            "patient_id": patient_id,
            "risk_mitigation": [],
            "ready_for_discharge": None,
            "clinical_insights": None,
        }

    admissions = db.query(Admission).filter(Admission.patient_id == patient_id).all()
    latest_adm = admissions[-1] if admissions else None

    pred = risk_service.latest_for_patient(db, patient_id)
    category = pred.risk_category if pred else None

    mitigation_steps: list[str] = [
        "Confirm follow-up appointment date and time before physical discharge.",
        "Ensure patient has a 30-day supply of all prescribed medications upon leaving.",
    ]

    ready: bool | None = None
    readiness_score: float | None = None

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
        ready = True
        readiness_score = 78.0
        mitigation_steps.extend(
            [
                "Verify transportation and family/caregiver support for discharge day.",
                "Provide written discharge instructions in patient's preferred language.",
            ]
        )
    elif category == "low":
        ready = True
        readiness_score = 90.0
    else:
        mitigation_steps.append(UNSCORED_NOTE)

    if latest_adm and latest_adm.time_in_hospital and latest_adm.time_in_hospital > 7:
        mitigation_steps.append(
            "Assess physical mobility and fall risk before discharge confirmation."
        )

    # Generate structured clinical insights
    monitoring_by_band: dict[str | None, str] = {
        "high": "Continue current treatment protocol. Requires intensified monitoring.",
        "medium": "Continue current treatment protocol. Moderate monitoring recommended.",
        "low": "Continue current treatment protocol. Standard monitoring sufficient.",
    }
    clinical_insights = {
        "risk_mitigation": " ".join(mitigation_steps),
        "care_recommendations": monitoring_by_band.get(
            category, f"Continue current treatment protocol. {UNSCORED_NOTE}"
        ),
        "follow_up_planning": _generate_follow_up_planning(category, _follow_up_days(category)),
        "discharge_recommendations": _generate_discharge_recommendations(category),
        "generated_at": datetime.now(UTC).isoformat(),
    }

    if persist and pred is not None:
        pred.clinical_insights = clinical_insights
        db.commit()
        db.refresh(pred)

    return {
        "patient_id": patient_id,
        "risk_category": category,
        "model_scored": pred is not None,
        "ready_for_discharge": ready,
        "readiness_score": readiness_score,
        "risk_mitigation": mitigation_steps,
        "checklist": [
            {"item": "Vital signs stable for 24 hours", "completed": True},
            {"item": "Medication reconciliation complete", "completed": True},
            {"item": "Follow-up appointment scheduled", "completed": ready},
            {"item": "Patient education materials handed over", "completed": True},
        ],
        "clinical_insights": clinical_insights,
        "persisted": persist and pred is not None,
    }


def _insight_item(patient: Patient, pred: RiskPrediction | None) -> dict[str, Any]:
    """One hub row: the patient, their latest score and any saved insights."""
    return {
        "patient_id": patient.id,
        "medical_record_number": patient.medical_record_number,
        "age_group": patient.age_group,
        "gender": patient.gender,
        "primary_diagnosis": patient.primary_diagnosis,
        "model_scored": pred is not None,
        "risk_category": pred.risk_category if pred else None,
        "readmission_probability": (
            round(float(pred.readmission_probability), 4) if pred else None
        ),
        "model_version": pred.model_version if pred else None,
        "scored_at": pred.created_at.isoformat() if pred else None,
        "insights": pred.clinical_insights if pred else None,
    }


def _latest_prediction_join_condition():
    """Correlated id of each patient's newest prediction, for a LEFT JOIN.

    Correlating on Patient keeps unscored patients in the cohort instead of
    dropping them, which is the difference between an empty hub and one that
    admits nobody has been scored.
    """
    return RiskPrediction.id == (
        select(RiskPrediction.id)
        .where(RiskPrediction.patient_id == Patient.id)
        .order_by(RiskPrediction.created_at.desc(), RiskPrediction.id.desc())
        .limit(1)
        .correlate(Patient)
        .scalar_subquery()
    )


def list_patient_insights(
    db: Session, actor: User, limit: int = 50, offset: int = 0
) -> tuple[list[dict[str, Any]], int]:
    """Return every patient the caller may see with their latest score and insights.

    The hub lists the whole cohort at once, so this is a single query instead of
    one request per patient.
    """
    stmt = select(Patient, RiskPrediction).outerjoin(
        RiskPrediction, _latest_prediction_join_condition()
    )
    count_stmt = select(func.count(Patient.id))

    if actor.role == Role.DOCTOR:
        stmt = stmt.where(Patient.assigned_doctor_id == actor.id)
        count_stmt = count_stmt.where(Patient.assigned_doctor_id == actor.id)

    total = db.execute(count_stmt).scalar_one()
    rows = db.execute(
        stmt.order_by(
            RiskPrediction.readmission_probability.desc().nullslast(),
            Patient.medical_record_number,
        )
        .limit(limit)
        .offset(offset)
    ).all()

    return [_insight_item(patient, pred) for patient, pred in rows], total


def patient_insights(db: Session, actor: User, patient_id: int) -> dict[str, Any] | None:
    """Return the same row for one patient, or None when they are not visible."""
    stmt = (
        select(Patient, RiskPrediction)
        .outerjoin(RiskPrediction, _latest_prediction_join_condition())
        .where(Patient.id == patient_id)
    )
    if actor.role == Role.DOCTOR:
        stmt = stmt.where(Patient.assigned_doctor_id == actor.id)

    row = db.execute(stmt).first()
    if row is None:
        return None
    patient, pred = row
    return _insight_item(patient, pred)


def active_model_summary() -> dict[str, Any]:
    """Name the model the pages credit, so the UI never has to hardcode it."""
    model = model_service.load_model()
    if model is None:
        return {"loaded": False, "name": None, "version": None, "decision_threshold": None}
    return {
        "loaded": True,
        "name": model.model_name,
        "version": model.model_version,
        "decision_threshold": model.decision_threshold,
    }
