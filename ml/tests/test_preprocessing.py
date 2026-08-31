"""Tests for data preprocessing and feature transformations."""

import pandas as pd

from src.data.preprocess import basic_clean, drop_unused_columns, map_icd9_to_category
from src.features.build_features import add_utilisation_features


def test_drop_unused_columns() -> None:
    """Unused columns specified in config should be dropped."""
    df = pd.DataFrame({"encounter_id": [1, 2], "age": [50, 60], "weight": ["?", "?"]})
    cleaned = drop_unused_columns(df, ["encounter_id", "weight"])
    assert "encounter_id" not in cleaned.columns
    assert "weight" not in cleaned.columns
    assert "age" in cleaned.columns


def test_map_icd9_to_category() -> None:
    """ICD-9 diagnosis codes should map to the correct clinical category."""
    assert map_icd9_to_category("250.01") == "Diabetes Mellitus"
    assert map_icd9_to_category("414") == "Circulatory (Cardiac/Vascular)"
    assert map_icd9_to_category("486") == "Respiratory (Pulmonary)"
    assert map_icd9_to_category("584") == "Genitourinary (Renal/Kidney)"
    assert map_icd9_to_category("V45") == "Supplementary (V-codes)"
    assert map_icd9_to_category("E878") == "External Cause (E-codes)"
    assert map_icd9_to_category("?") == "Missing/Unknown"
    assert map_icd9_to_category(None) == "Missing/Unknown"


def test_basic_clean_filters_expired_dispositions() -> None:
    """Expired or hospice disposition encounters should be removed."""
    df = pd.DataFrame(
        {
            "discharge_disposition_id": [1, 11, 2, 19, 20],
            "diag_1": ["250.01", "414", "486", "584", "250.02"],
        }
    )
    cleaned = basic_clean(df, {"preprocessing": {"drop_columns": []}})
    assert 11 not in cleaned["discharge_disposition_id"].values
    assert 19 not in cleaned["discharge_disposition_id"].values
    assert 20 not in cleaned["discharge_disposition_id"].values
    assert len(cleaned) == 2


def test_add_utilisation_features() -> None:
    """Prior visits should sum correctly and medication indicators are encoded."""
    df = pd.DataFrame(
        {
            "number_outpatient": [1, 0],
            "number_emergency": [2, 1],
            "number_inpatient": [3, 0],
            "change": ["Ch", "No"],
            "diabetesMed": ["Yes", "No"],
        }
    )
    result = add_utilisation_features(df)
    assert list(result["prior_visits_total"]) == [6, 1]
    assert list(result["medication_changed"]) == [1, 0]
    assert list(result["diabetes_med_prescribed"]) == [1, 0]
