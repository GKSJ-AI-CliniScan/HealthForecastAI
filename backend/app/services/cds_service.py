"""Deterministic, rule-based Clinical Decision Support.

No LLM and no external call: every recommendation is a plain mapping from a
patient's latest persisted risk prediction (and, where relevant, their most
recent admission) onto a fixed recommendation library, so a clinician can see
exactly why a suggestion fired. Recommendations are computed on demand rather
than persisted - there is no new table to keep in sync with a prediction that
can change on every re-score.

One-directional dependency only: this module imports RiskService to fetch the
latest prediction; risk_service.py never imports this module back, so there
is no circular import between prediction and CDS.
"""

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.models.admission import Admission
from app.models.prediction import RiskPrediction
from app.repositories.admission_repository import AdmissionRepository
from app.services.patient_service import PatientNotFoundError, PatientService
from app.services.risk_service import NoPredictionError, RiskService

# A high-medication-count discharge is a recognised regimen-complexity /
# adherence-risk proxy (ML Design section 7, Treatment Features).
HIGH_MEDICATION_COUNT = 5

FOLLOW_UP_DAYS_BY_CATEGORY = {"high": 7, "medium": 14, "low": 30}


@dataclass(frozen=True)
class Recommendation:
    """One deterministic, rule-based suggestion."""

    category: str
    text: str


class NoRiskPredictionError(Exception):
    """Raised when a patient has no risk score yet to base recommendations on."""


def _most_recent_admission(db: Session, patient_id: int) -> Admission | None:
    rows = AdmissionRepository(db).list_for_patient(patient_id, limit=1)
    return rows[0] if rows else None


def follow_up_recommendations(
    prediction: RiskPrediction, admission: Admission | None
) -> list[Recommendation]:
    """Map a risk category (+ medication burden) onto a follow-up cadence."""
    items: list[Recommendation] = []
    if prediction.risk_category == "high":
        items.append(
            Recommendation(
                "follow_up", "Schedule a 7-day post-discharge follow-up call."
            )
        )
        items.append(
            Recommendation("follow_up", "Schedule a 14-day in-person follow-up visit.")
        )
    elif prediction.risk_category == "medium":
        items.append(Recommendation("follow_up", "Schedule a 14-day follow-up call."))
    else:
        items.append(
            Recommendation("follow_up", "Standard follow-up per department protocol.")
        )

    if (
        admission is not None
        and (admission.num_medications or 0) >= HIGH_MEDICATION_COUNT
    ):
        items.append(
            Recommendation(
                "care",
                "Refer for a pharmacist medication-reconciliation review "
                f"({admission.num_medications} discharge medications).",
            )
        )
    return items


def risk_mitigation_recommendations(prediction: RiskPrediction) -> list[Recommendation]:
    """Map risk drivers onto preventive-intervention suggestions."""
    items: list[Recommendation] = []
    if prediction.risk_category == "high":
        items.append(
            Recommendation(
                "risk_mitigation", "Priority clinical review before discharge."
            )
        )
        items.append(
            Recommendation(
                "risk_mitigation",
                "Consider a case-management referral to reduce readmission risk.",
            )
        )
    elif prediction.risk_category == "medium":
        items.append(
            Recommendation(
                "risk_mitigation", "Monitor for emerging risk drivers at next review."
            )
        )
    return items


def discharge_checklist(prediction: RiskPrediction) -> list[Recommendation]:
    """Map a risk category onto a discharge checklist."""
    if prediction.risk_category == "high":
        return [
            Recommendation(
                "discharge_checklist", "Mandatory clinical review before discharge."
            ),
            Recommendation(
                "discharge_checklist",
                "Confirm a documented follow-up appointment before discharge.",
            ),
            Recommendation(
                "discharge_checklist",
                "Provide written discharge instructions and warning signs.",
            ),
        ]
    if prediction.risk_category == "medium":
        return [
            Recommendation(
                "discharge_checklist",
                "Confirm a documented follow-up appointment before discharge.",
            ),
            Recommendation(
                "discharge_checklist", "Provide written discharge instructions."
            ),
        ]
    return [Recommendation("discharge_checklist", "Standard discharge instructions.")]


def _ready_for_discharge(prediction: RiskPrediction) -> bool:
    """True only for Low risk - Medium/High both require review first."""
    return prediction.risk_category == "low"


class CDSService:
    """Generates care recommendations and discharge plans from a patient's
    latest risk prediction, applying the same doctor-scope rules every other
    patient-facing read uses."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.patients = PatientService(db)
        self.risk = RiskService(db)

    def _latest_prediction(self, user: CurrentUser, patient_id: int) -> RiskPrediction:
        try:
            return self.risk.latest(user, patient_id)
        except NoPredictionError as exc:
            raise NoRiskPredictionError(str(patient_id)) from exc

    def care_recommendations(
        self, user: CurrentUser, patient_id: int
    ) -> dict[str, Any]:
        """Return follow-up and care recommendations for a patient.

        Raises PatientNotFoundError or NoRiskPredictionError - the endpoint
        translates each into the matching HTTP response.
        """
        self.patients.get_patient(user, patient_id)  # scope check + audit
        prediction = self._latest_prediction(user, patient_id)
        admission = _most_recent_admission(self.db, patient_id)

        recommendations = follow_up_recommendations(prediction, admission)
        return {
            "patient_id": patient_id,
            "risk_category": prediction.risk_category,
            "based_on_prediction_id": prediction.id,
            "recommendations": [
                {"category": item.category, "text": item.text}
                for item in recommendations
            ],
            "follow_up_days": FOLLOW_UP_DAYS_BY_CATEGORY[prediction.risk_category],
        }

    def discharge_plan(self, user: CurrentUser, patient_id: int) -> dict[str, Any]:
        """Return a discharge readiness assessment and mitigation steps.

        Raises PatientNotFoundError or NoRiskPredictionError - the endpoint
        translates each into the matching HTTP response.
        """
        self.patients.get_patient(user, patient_id)  # scope check + audit
        prediction = self._latest_prediction(user, patient_id)

        return {
            "patient_id": patient_id,
            "risk_category": prediction.risk_category,
            "based_on_prediction_id": prediction.id,
            "risk_mitigation": [
                {"category": item.category, "text": item.text}
                for item in risk_mitigation_recommendations(prediction)
            ],
            "discharge_checklist": [
                {"category": item.category, "text": item.text}
                for item in discharge_checklist(prediction)
            ],
            "ready_for_discharge": _ready_for_discharge(prediction),
        }


__all__ = [
    "CDSService",
    "NoRiskPredictionError",
    "PatientNotFoundError",
    "Recommendation",
    "discharge_checklist",
    "follow_up_recommendations",
    "risk_mitigation_recommendations",
]
