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
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.services import patient_service, risk_service

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
