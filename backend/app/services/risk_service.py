"""Risk scoring helpers shared by the API and the batch jobs."""

import math
from typing import Any

from app.core.config import settings
from app.services.cds_service import generate_clinical_insights

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


def compute_readmission_probability(data: dict[str, Any]) -> float:
    """Compute calibrated readmission probability from patient encounter clinical features."""
    score = -2.2

    inpatient = int(data.get("number_inpatient", 0))
    emergency = int(data.get("number_emergency", 0))
    score += inpatient * 0.45
    score += emergency * 0.25

    stay = int(data.get("time_in_hospital", 1))
    score += stay * 0.05

    meds = int(data.get("num_medications", 1))
    diagnoses = int(data.get("number_diagnoses", 1))
    score += meds * 0.02
    score += diagnoses * 0.04

    a1c = str(data.get("A1Cresult", "None")).strip().lower()
    if a1c in [">8", "high", "> 8"]:
        score += 0.35

    probability = 1.0 / (1.0 + math.exp(-score))
    return round(float(probability), 4)


def evaluate_patient_risk(data: dict[str, Any]) -> dict[str, Any]:
    """Execute complete risk evaluation pipeline including scoring, risk tier, and CDS insights."""
    probability = compute_readmission_probability(data)
    risk_cat = categorise_risk(probability)
    contributing_factors, recommended_actions = generate_clinical_insights(data, probability)

    return {
        "readmission_probability": probability,
        "risk_category": risk_cat,
        "contributing_factors": contributing_factors,
        "recommended_actions": recommended_actions,
    }
