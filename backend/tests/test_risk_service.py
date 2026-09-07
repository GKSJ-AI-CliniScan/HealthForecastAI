"""Tests for the shared risk banding logic."""

import pytest

from app.services.risk_service import (
    RISK_HIGH,
    RISK_LOW,
    RISK_MEDIUM,
    categorise_risk,
    compute_readmission_probability,
    evaluate_patient_risk,
)


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.00, RISK_LOW),
        (0.39, RISK_LOW),
        (0.40, RISK_MEDIUM),
        (0.69, RISK_MEDIUM),
        (0.70, RISK_HIGH),
        (1.00, RISK_HIGH),
    ],
)
def test_risk_bands(probability: float, expected: str) -> None:
    """Probabilities map onto the documented risk bands at the threshold edges."""
    assert categorise_risk(probability) == expected


@pytest.mark.parametrize("probability", [-0.01, 1.01, 42.0])
def test_out_of_range_probability_is_rejected(probability: float) -> None:
    """A probability outside [0, 1] is a bug and must raise."""
    with pytest.raises(ValueError):
        categorise_risk(probability)


def test_compute_readmission_probability_range() -> None:
    """Readmission probability must always fall in the valid range [0, 1]."""
    payload = {
        "time_in_hospital": 5,
        "num_medications": 12,
        "num_lab_procedures": 40,
        "number_diagnoses": 6,
        "number_inpatient": 1,
        "number_emergency": 0,
        "A1Cresult": "None",
    }
    prob = compute_readmission_probability(payload)
    assert 0.0 <= prob <= 1.0


def test_evaluate_patient_risk_generates_insights() -> None:
    """High utilization encounter must return high or medium tier and actionable insights."""
    payload = {
        "patient_id": 101,
        "time_in_hospital": 8,
        "num_medications": 18,
        "num_lab_procedures": 60,
        "number_diagnoses": 9,
        "number_inpatient": 3,
        "number_emergency": 1,
        "A1Cresult": ">8",
    }
    result = evaluate_patient_risk(payload)
    assert "readmission_probability" in result
    assert result["risk_category"] in [RISK_MEDIUM, RISK_HIGH]
    assert len(result["contributing_factors"]) > 0
    assert len(result["recommended_actions"]) > 0
