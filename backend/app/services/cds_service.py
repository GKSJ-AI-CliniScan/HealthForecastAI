"""Clinical decision support: care recommendations and discharge planning.

Milestone 3 (Module 5).

The design choice that matters: this is a transparent rule set, not a model. Every
recommendation names the rule that produced it, states why in plain words, and
lists the exact values from the patient's record that triggered it. A clinician
can disagree with a rule. They cannot disagree with "the algorithm said so".

Three things this deliberately is not:

  * Not clinical advice. Every response carries `clinical_review_required` and a
    disclaimer. The thresholds below are illustrative defaults, chosen to be
    conservative and widely used, and they need sign-off from a qualified
    clinician before any use on real patients. They live in one table so that
    sign-off can change them without touching logic.
  * Not a replacement for the risk score. The score says how likely a readmission
    is; the rules turn the factors behind it into things a person could do.
  * Not silent about uncertainty. Where a rule depends on a value that is missing
    from the record, it does not fire on the missing value.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.services import model_service, patient_service, risk_service

RULES_VERSION = "1.0"

# Illustrative defaults awaiting clinical sign-off. Changing a number here changes
# which patients a rule applies to and nothing else.
THRESHOLDS: dict[str, Any] = {
    "follow_up_days": {"high": 7, "medium": 14, "low": 30},
    "polypharmacy_medications": 15,
    "prior_inpatient_visits": 2,
    "frequent_emergency_visits": 2,
    "long_stay_days": 8,
    "poor_glycaemic_control": ">8",
    "post_discharge_call_hours": "48-72",
}

DISCLAIMER = (
    "Decision support, not clinical advice. These suggestions are generated from the "
    "patient's record and a statistical model, using illustrative rules that have not "
    "been clinically validated. A qualified clinician must review them before any "
    "action is taken."
)

PRIORITY_ORDER = {"high": 0, "medium": 1, "routine": 2}

FACILITY_KEYWORDS = ("SNF", "nursing", "rehab", "inpatient care", "long term care", "ICF")


@dataclass
class Context:
    """Everything the rules may look at, gathered once."""

    patient_id: int
    probability: float | None = None
    band: str | None = None
    baseline: float | None = None
    primary_diagnosis: str | None = None
    admission: dict[str, Any] = field(default_factory=dict)
    treatments: list[dict[str, Any]] = field(default_factory=list)
    explanation: dict[str, Any] | None = None

    def value(self, key: str) -> Any:
        """A field from the admission, or None when it was not recorded."""
        return self.admission.get(key)

    @property
    def multiple_of_baseline(self) -> float | None:
        if self.probability is None or not self.baseline:
            return None
        return round(self.probability / self.baseline, 2)

    def on_drug(self, name: str, dose_change: str | None = None) -> bool:
        return any(
            t["treatment_name"] == name and (dose_change is None or t["dose_change"] == dose_change)
            for t in self.treatments
        )

    def discharged_to_facility(self) -> bool:
        disposition = str(self.value("discharge_disposition") or "")
        return any(word.lower() in disposition.lower() for word in FACILITY_KEYWORDS)

    def discharged_home(self) -> bool:
        return str(self.value("discharge_disposition") or "").startswith("Discharged to home")


@dataclass(frozen=True)
class Rule:
    """One transparent recommendation rule."""

    id: str
    category: str
    priority: str
    timing: str  # before discharge / at discharge / after discharge
    action: str
    applies: Callable[[Context], bool]
    rationale: Callable[[Context], str]
    evidence: Callable[[Context], dict[str, Any]]


def _n(context: Context, key: str) -> int | None:
    value = context.value(key)
    return int(value) if value is not None else None


def _evidence(context: Context, *keys: str) -> dict[str, Any]:
    return {key: context.value(key) for key in keys if context.value(key) is not None}


def _risk_evidence(context: Context) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if context.probability is not None:
        out["readmission_probability"] = round(context.probability, 3)
    if context.multiple_of_baseline is not None:
        out["times_the_average_patient"] = context.multiple_of_baseline
    return out


RULES: list[Rule] = [
    Rule(
        id="follow-up-high",
        category="Follow-up",
        priority="high",
        timing="after discharge",
        action=(
            f"Arrange a follow-up visit within {THRESHOLDS['follow_up_days']['high']} days "
            "of discharge."
        ),
        applies=lambda c: c.band == "high",
        rationale=lambda c: (
            f"Predicted 30-day readmission risk is {c.probability:.0%}"
            + (f", {c.multiple_of_baseline}x the average patient" if c.multiple_of_baseline else "")
            + ". Early review is the most consistent way to reduce avoidable readmission."
        ),
        evidence=_risk_evidence,
    ),
    Rule(
        id="follow-up-medium",
        category="Follow-up",
        priority="medium",
        timing="after discharge",
        action=(
            f"Arrange a follow-up visit within {THRESHOLDS['follow_up_days']['medium']} days "
            "of discharge."
        ),
        applies=lambda c: c.band == "medium",
        rationale=lambda c: (
            f"Predicted 30-day readmission risk is {c.probability:.0%}, above the average."
        ),
        evidence=_risk_evidence,
    ),
    Rule(
        id="follow-up-routine",
        category="Follow-up",
        priority="routine",
        timing="after discharge",
        action=(
            f"Routine follow-up within {THRESHOLDS['follow_up_days']['low']} days is " "sufficient."
        ),
        applies=lambda c: c.band == "low",
        rationale=lambda c: (
            f"Predicted 30-day readmission risk is {c.probability:.0%}, below the average."
        ),
        evidence=_risk_evidence,
    ),
    Rule(
        id="post-discharge-contact",
        category="Transition of care",
        priority="high",
        timing="after discharge",
        action=(
            "Make a telephone contact "
            f"{THRESHOLDS['post_discharge_call_hours']} hours after discharge to check "
            "symptoms, medicines and appointments."
        ),
        applies=lambda c: c.band == "high",
        rationale=lambda c: "High-risk patients benefit most from an early check that they are coping.",
        evidence=_risk_evidence,
    ),
    Rule(
        id="home-support",
        category="Transition of care",
        priority="high",
        timing="at discharge",
        action="Consider a home health or community nursing referral.",
        applies=lambda c: c.band == "high" and c.discharged_home(),
        rationale=lambda c: (
            "High readmission risk and discharge home without a recorded support service."
        ),
        evidence=lambda c: {**_risk_evidence(c), **_evidence(c, "discharge_disposition")},
    ),
    Rule(
        id="facility-handover",
        category="Transition of care",
        priority="medium",
        timing="at discharge",
        action=(
            "Send the discharge summary and current medication list to the receiving "
            "facility and confirm they were received."
        ),
        applies=lambda c: c.discharged_to_facility(),
        rationale=lambda c: "The patient is being discharged to another care facility.",
        evidence=lambda c: _evidence(c, "discharge_disposition"),
    ),
    Rule(
        id="care-coordination",
        category="Care coordination",
        priority="high",
        timing="before discharge",
        action=(
            "Review why the patient has been admitted repeatedly and consider a "
            "case-management or care-coordination referral."
        ),
        applies=lambda c: (_n(c, "number_inpatient") or 0) >= THRESHOLDS["prior_inpatient_visits"]
        and c.band != "low",
        rationale=lambda c: (
            f"{_n(c, 'number_inpatient')} inpatient admissions in the past year. Prior "
            "admissions are the strongest single predictor of readmission in this model."
        ),
        evidence=lambda c: {**_evidence(c, "number_inpatient"), **_risk_evidence(c)},
    ),
    Rule(
        id="frequent-emergency",
        category="Care coordination",
        priority="medium",
        timing="after discharge",
        action="Review access to primary care and outpatient options to reduce emergency attendance.",
        applies=lambda c: (_n(c, "number_emergency") or 0)
        >= THRESHOLDS["frequent_emergency_visits"],
        rationale=lambda c: f"{_n(c, 'number_emergency')} emergency visits in the past year.",
        evidence=lambda c: _evidence(c, "number_emergency"),
    ),
    Rule(
        id="medication-reconciliation",
        category="Medicines",
        priority="high",
        timing="before discharge",
        action="Arrange a pharmacist-led medication reconciliation before discharge.",
        applies=lambda c: (_n(c, "num_medications") or 0) >= THRESHOLDS["polypharmacy_medications"],
        rationale=lambda c: (
            f"{_n(c, 'num_medications')} medications recorded. A long list raises the chance "
            "of duplication, interaction and non-adherence."
        ),
        evidence=lambda c: _evidence(c, "num_medications"),
    ),
    Rule(
        id="regimen-change-teaching",
        category="Medicines",
        priority="medium",
        timing="before discharge",
        action=(
            "Confirm the patient understands the changed regimen and how to monitor "
            "themselves, before they leave."
        ),
        applies=lambda c: bool(c.value("medication_changed")),
        rationale=lambda c: "The diabetes medication regimen was changed during this stay.",
        evidence=lambda c: {
            "medication_changed": True,
            "changed": [
                f"{t['treatment_name']} ({t['dose_change'].lower()})"
                for t in c.treatments
                if t["dose_change"] in ("Up", "Down")
            ],
        },
    ),
    Rule(
        id="insulin-titration",
        category="Medicines",
        priority="medium",
        timing="before discharge",
        action="Provide written insulin dosing instructions and arrange early glucose review.",
        applies=lambda c: c.on_drug("insulin", "Up") or c.on_drug("insulin", "Down"),
        rationale=lambda c: "The insulin dose was changed during the stay.",
        evidence=lambda c: {
            "insulin": next(
                t["dose_change"] for t in c.treatments if t["treatment_name"] == "insulin"
            )
        },
    ),
    Rule(
        id="hba1c-missing",
        category="Diabetes care",
        priority="medium",
        timing="before discharge",
        action=(
            "No HbA1c is recorded for this stay. Consider testing if none has been done "
            "recently, following local protocol."
        ),
        applies=lambda c: c.value("a1c_result") is None and c.primary_diagnosis == "Diabetes",
        rationale=lambda c: (
            "Diabetes is the primary diagnosis and no HbA1c was measured during the stay."
        ),
        evidence=lambda c: {"primary_diagnosis": c.primary_diagnosis, "a1c_result": "not measured"},
    ),
    Rule(
        id="hba1c-high",
        category="Diabetes care",
        priority="high",
        timing="before discharge",
        action=(
            "HbA1c is above 8%. Review the glycaemic management plan and consider "
            "endocrinology input."
        ),
        applies=lambda c: c.value("a1c_result") == THRESHOLDS["poor_glycaemic_control"],
        rationale=lambda c: "The recorded HbA1c result is above 8%, which indicates poor control.",
        evidence=lambda c: _evidence(c, "a1c_result"),
    ),
    Rule(
        id="long-stay",
        category="Discharge readiness",
        priority="medium",
        timing="before discharge",
        action=(
            "Check functional status, mobility and equipment needs before discharge "
            "after a long stay."
        ),
        applies=lambda c: (_n(c, "time_in_hospital") or 0) >= THRESHOLDS["long_stay_days"],
        rationale=lambda c: f"Length of stay was {_n(c, 'time_in_hospital')} days.",
        evidence=lambda c: _evidence(c, "time_in_hospital"),
    ),
]


# --------------------------------------------------------------------------
# Building the output
# --------------------------------------------------------------------------


def evaluate(context: Context) -> list[dict[str, Any]]:
    """Run every rule against a context, returning those that apply, highest priority first."""
    fired: list[dict[str, Any]] = []
    for rule in RULES:
        try:
            applies = rule.applies(context)
        except (TypeError, ValueError, StopIteration):
            applies = False  # a rule must never break the response over a bad value
        if not applies:
            continue
        fired.append(
            {
                "id": rule.id,
                "category": rule.category,
                "priority": rule.priority,
                "timing": rule.timing,
                "action": rule.action,
                "rationale": rule.rationale(context),
                "evidence": rule.evidence(context),
            }
        )
    fired.sort(key=lambda item: (PRIORITY_ORDER[item["priority"]], item["category"]))
    return fired


def follow_up_days(band: str | None) -> int | None:
    """Suggested follow-up interval for a risk band."""
    return THRESHOLDS["follow_up_days"].get(band) if band else None


def load_context(db: Session, actor: User, patient_id: int) -> Context | None:
    """Gather a patient's record for the rules. None when outside the caller's scope."""
    patient = patient_service.get_patient(db, actor, patient_id)
    if patient is None:
        return None

    admission = db.execute(
        select(Admission)
        .where(Admission.patient_id == patient_id)
        .order_by(Admission.id.desc())
        .limit(1)
    ).scalar_one_or_none()

    prediction: RiskPrediction | None = risk_service.latest_for_patient(db, patient_id)

    context = Context(patient_id=patient_id, primary_diagnosis=patient.primary_diagnosis)

    if admission is not None:
        context.admission = {
            column: getattr(admission, column)
            for column in (
                "time_in_hospital",
                "num_medications",
                "num_lab_procedures",
                "number_diagnoses",
                "number_inpatient",
                "number_emergency",
                "number_outpatient",
                "a1c_result",
                "max_glu_serum",
                "diabetes_med",
                "medication_changed",
                "discharge_disposition",
                "admission_type",
                "department",
            )
        }
        rows = db.execute(
            select(TreatmentOutcome.treatment_name, TreatmentOutcome.dose_change).where(
                TreatmentOutcome.admission_id == admission.id
            )
        )
        context.treatments = [
            {"treatment_name": name, "dose_change": change} for name, change in rows
        ]

    if prediction is not None:
        context.probability = float(prediction.readmission_probability)
        context.band = prediction.risk_category
        context.explanation = prediction.drivers
        if prediction.drivers:
            context.baseline = prediction.drivers.get("baseline_probability")

    return context


def _risk_block(context: Context) -> dict[str, Any] | None:
    if context.probability is None:
        return None
    return {
        "readmission_probability": round(context.probability, 4),
        "risk_category": context.band,
        "baseline_probability": context.baseline,
        "times_the_average_patient": context.multiple_of_baseline,
    }


def recommendations(context: Context) -> dict[str, Any]:
    """Care recommendations for a patient."""
    return {
        "patient_id": context.patient_id,
        "risk": _risk_block(context),
        "follow_up_days": follow_up_days(context.band),
        "recommendations": evaluate(context),
        "explanation": context.explanation,
        "rules_version": RULES_VERSION,
        "rules_evaluated": len(RULES),
        "clinical_review_required": True,
        "disclaimer": DISCLAIMER,
    }


def discharge_plan(context: Context) -> dict[str, Any]:
    """A discharge checklist: the same rules, grouped by when they need doing."""
    fired = evaluate(context)

    sections: dict[str, list[dict[str, Any]]] = {
        "before discharge": [],
        "at discharge": [],
        "after discharge": [],
    }
    for item in fired:
        sections[item["timing"]].append(item)

    flags: list[str] = []
    if context.band == "high":
        flags.append("High predicted readmission risk - review before the patient leaves.")
    if (_n(context, "time_in_hospital") or 0) >= THRESHOLDS["long_stay_days"]:
        flags.append("Long length of stay.")
    if context.probability is None:
        flags.append("This patient has not been risk-scored, so no risk-based steps are shown.")

    return {
        "patient_id": context.patient_id,
        "risk": _risk_block(context),
        "follow_up_days": follow_up_days(context.band),
        "sections": sections,
        "flags": flags,
        "total_actions": len(fired),
        "rules_version": RULES_VERSION,
        "clinical_review_required": True,
        "disclaimer": DISCLAIMER,
    }


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
