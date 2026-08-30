"""Tests that guard the modelling configuration contract."""

from src.utils.config import load_config


def test_default_config_loads() -> None:
    """configs/config.yaml must always be parseable."""
    config = load_config()
    assert config, "config.yaml is empty"


def test_required_sections_are_present() -> None:
    """The pipeline reads these sections - none may be removed."""
    config = load_config()
    for section in (
        "dataset",
        "split",
        "preprocessing",
        "models",
        "evaluation",
        "artifacts",
    ):
        assert section in config, f"config.yaml is missing the '{section}' section"


def test_risk_bands_match_the_backend_defaults() -> None:
    """Risk thresholds must match backend .env.example and risk_service.py."""
    bands = load_config()["risk_bands"]
    assert bands["high"] == 0.70
    assert bands["medium"] == 0.40


def test_at_least_one_model_is_enabled() -> None:
    """Training fails fast when no model is enabled - catch it here instead."""
    models = load_config()["models"]
    assert any(params.get("enabled") for params in models.values())
