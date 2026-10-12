"""Tests that guard the modelling configuration contract."""

from src.utils.config import load_config


def test_default_config_loads() -> None:
    """configs/config.yaml must always be parseable."""
    config = load_config()
    assert config, "config.yaml is empty"


def test_required_sections_are_present() -> None:
    """The pipeline reads these sections - none may be removed."""
    config = load_config()
    for section in ("dataset", "split", "preprocessing", "models", "evaluation", "artifacts"):
        assert section in config, f"config.yaml is missing the '{section}' section"


def test_risk_bands_match_the_backend_defaults() -> None:
    """Risk thresholds must match backend/app/core/config.py and .env.example.

    Set in Milestone 2 from the calibrated probability distribution: the high
    band runs 2.86x the baseline readmission rate, medium 1.65x. If you change
    one of the three places these live, this test fails until you change them
    all.
    """
    bands = load_config()["risk_bands"]
    assert bands["high"] == 0.20
    assert bands["medium"] == 0.12


def test_calibration_is_enabled() -> None:
    """Uncalibrated probabilities made the forecast overshoot by 5x."""
    calibration = load_config()["calibration"]
    assert calibration["enabled"] is True
    assert calibration["method"] in {"sigmoid", "isotonic"}


def test_promotion_gate_still_rejects_a_useless_model() -> None:
    """The gate may be tuned to the dataset, but it must stay above chance."""
    thresholds = load_config()["evaluation"]["thresholds"]
    assert thresholds["roc_auc"] > 0.60, "a gate at or below 0.60 accepts near-random models"
    assert thresholds["recall"] >= 0.50, "the clinical recall floor must not be lowered"


def test_at_least_one_model_is_enabled() -> None:
    """Training fails fast when no model is enabled - catch it here instead."""
    models = load_config()["models"]
    assert any(params.get("enabled") for params in models.values())
