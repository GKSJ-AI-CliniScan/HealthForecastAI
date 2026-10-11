"""Tests that guard the modelling configuration contract."""

import pytest

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
    """Risk thresholds must match backend .env.example and risk_service.py."""
    bands = load_config()["risk_bands"]
    assert bands["high"] == 0.70
    assert bands["medium"] == 0.40


def test_at_least_one_model_is_enabled() -> None:
    """Training fails fast when no model is enabled - catch it here instead."""
    models = load_config()["models"]
    assert any(params.get("enabled") for params in models.values())


def test_india_hospital_readmission_is_the_primary_active_profile() -> None:
    """Locks in the architecture decision: India Hospital Readmission is primary,
    Diabetes 130-US is a fallback - see HealthForecastAI_Gap_Analysis.md section 5."""
    dataset = load_config()["dataset"]
    assert dataset["active"] == "india_hospital_readmission"


def test_both_dataset_profiles_are_defined() -> None:
    dataset = load_config()["dataset"]
    assert set(dataset["profiles"]) == {"india_hospital_readmission", "diabetes_130_us"}


COMMON_FIELDS = ["na_values", "id_column", "drop_columns"]
SINGLE_CSV_FIELDS = [
    "raw_path",
    "target_column",
    "readmission_positive_label",
    "risk_negative_label",
]
RELATIONAL_FIELDS = ["raw_dir", "tables", "targets", "label_columns", "encounter_key"]


@pytest.mark.parametrize("field", COMMON_FIELDS + SINGLE_CSV_FIELDS + RELATIONAL_FIELDS)
def test_every_profile_defines_the_fields_its_format_reads(field: str) -> None:
    profiles = load_config()["dataset"]["profiles"]
    for name, profile in profiles.items():
        relational = profile.get("format") == "relational"
        required = COMMON_FIELDS + (RELATIONAL_FIELDS if relational else SINGLE_CSV_FIELDS)
        if field in required:
            assert field in profile, f"profile '{name}' is missing '{field}'"


def test_relational_profile_declares_both_targets_from_real_label_columns() -> None:
    profile = load_config()["dataset"]["profiles"]["india_hospital_readmission"]
    assert profile["format"] == "relational"
    assert set(profile["tables"]) == {"patients", "admissions", "diagnoses"}
    targets = profile["targets"]
    assert set(targets) == {"risk", "readmission"}
    for spec in targets.values():
        assert set(spec["positive_if"]) <= set(profile["label_columns"]) | {"discharge_type"}
    # Expired encounters cannot be readmitted: excluded from the readmission label.
    assert targets["readmission"]["exclude_if"] == {"discharge_type": ["Expired"]}
    # discharge_type defines part of the risk label, so it must not be a risk feature.
    assert "discharge_type" in targets["risk"]["exclude_features"]
    assert "90_day" not in targets and "readmission_90d" not in targets


def test_xgboost_is_the_primary_model_and_random_forest_is_supporting() -> None:
    """Locks in the locked model-selection decision - do not silently swap these."""
    models = load_config()["models"]
    assert models["xgboost"]["enabled"] is True
    assert models["random_forest"]["enabled"] is True


def test_artifact_filenames_are_target_templated() -> None:
    """Risk and readmission are separate training flows with separate artefacts."""
    artifacts = load_config()["artifacts"]
    assert "{target}" in artifacts["model_filename"]
    assert "{target}" in artifacts["metrics_filename"]
