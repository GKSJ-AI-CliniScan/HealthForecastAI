"""Risk scoring helpers shared by the API and the batch jobs."""

from __future__ import annotations

from dataclasses import dataclass

from app.api.deps import CurrentUser
from app.core.config import settings
from app.services import model_service
from app.services.patient_service import PatientRecord, visible_patients

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


@dataclass(frozen=True)
class ScoredPatient:
    """A patient together with their current risk."""

    patient: PatientRecord
    probability: float
    category: str


def score_patient(patient: PatientRecord) -> ScoredPatient:
    """Score one patient's latest admission."""
    probability = model_service.predict_probability(patient.features())
    return ScoredPatient(patient, probability, categorise_risk(probability))


def score_patients(patients: list[PatientRecord]) -> list[ScoredPatient]:
    """Score many patients."""
    return [score_patient(p) for p in patients]


def high_risk_cohort(user: CurrentUser) -> list[ScoredPatient]:
    """Return the caller's high risk patients, riskiest first."""
    scored = score_patients(visible_patients(user))
    high = [s for s in scored if s.category == RISK_HIGH]
    return sorted(high, key=lambda s: s.probability, reverse=True)


def forecast(patients: list[PatientRecord], horizon_days: int) -> tuple[int, float]:
    """Expected readmissions and rate for a cohort over the horizon.

    The model's probability is a 30 day readmission risk, so counts are scaled
    by ``horizon_days / 30`` and capped at the cohort size.
    """
    if not patients:
        return 0, 0.0
    scored = score_patients(patients)
    rate = sum(s.probability for s in scored) / len(scored)
    scaled_rate = min(1.0, rate * horizon_days / 30)
    return round(scaled_rate * len(scored)), round(scaled_rate, 4)


def forecast_by_department(patients: list[PatientRecord], horizon_days: int) -> list[dict]:
    """Forecast per department, highest rate first."""
    departments = sorted({p.department for p in patients})
    rows = []
    for name in departments:
        cohort = [p for p in patients if p.department == name]
        count, rate = forecast(cohort, horizon_days)
        rows.append(
            {
                "department": name,
                "patients": len(cohort),
                "predicted_readmissions": count,
                "predicted_rate": rate,
            }
        )
    return sorted(rows, key=lambda r: r["predicted_rate"], reverse=True)
