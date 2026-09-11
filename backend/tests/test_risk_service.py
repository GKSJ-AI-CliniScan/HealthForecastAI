"""Tests for the shared risk banding logic."""

import pytest

from app.core.config import settings
from app.services.risk_service import RISK_HIGH, RISK_LOW, RISK_MEDIUM, categorise_risk

MEDIUM = settings.RISK_THRESHOLD_MEDIUM
HIGH = settings.RISK_THRESHOLD_HIGH


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.00, RISK_LOW),
        (MEDIUM - 0.01, RISK_LOW),
        (MEDIUM, RISK_MEDIUM),
        (HIGH - 0.01, RISK_MEDIUM),
        (HIGH, RISK_HIGH),
        (1.00, RISK_HIGH),
    ],
)
def test_risk_bands(probability: float, expected: str) -> None:
    """Probabilities map onto the configured risk bands at the threshold edges."""
    assert categorise_risk(probability) == expected


@pytest.mark.parametrize("probability", [-0.01, 1.01, 42.0])
def test_out_of_range_probability_is_rejected(probability: float) -> None:
    """A probability outside [0, 1] is a bug and must raise."""
    with pytest.raises(ValueError):
        categorise_risk(probability)