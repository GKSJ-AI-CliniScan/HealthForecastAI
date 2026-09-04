"""Tests for the five N3 candidate feature-engineering levers.

Every lever was screened via CV in ml/src/experiments/n3_feature_engineering.py
and REVERTED (see ml/artifacts/n3_ledger.json) - none is wired into
build_features()'s default call chain. These functions stay tested even
though unused: they are correct, documented, reusable building blocks a
future milestone might revisit, not dead code accumulating silently.
"""

from __future__ import annotations

import pandas as pd

from src.features.build_features import (
    add_any_medication_change_flag,
    add_utilisation_ratio_features,
    bin_number_diagnoses,
    drop_raw_diagnosis_codes,
    use_ordinal_age_only,
)


def test_drop_raw_diagnosis_codes_keeps_only_the_groups() -> None:
    """Lever 1: raw diag_1/2/3 are dropped, the pre-computed groups survive."""
    frame = pd.DataFrame(
        {
            "diag_1": ["250.83"],
            "diag_2": ["V57"],
            "diag_3": ["428"],
            "diag_1_group": ["Diabetes"],
            "diag_2_group": ["Other"],
            "diag_3_group": ["Circulatory"],
            "age": ["[70-80)"],
        }
    )
    result = drop_raw_diagnosis_codes(frame)
    assert "diag_1" not in result.columns
    assert "diag_2" not in result.columns
    assert "diag_3" not in result.columns
    assert list(result["diag_1_group"]) == ["Diabetes"]
    assert "age" in result.columns


def test_utilisation_ratio_and_interaction_are_computed_per_row() -> None:
    """Lever 2: both new columns come from this row's own three columns only."""
    frame = pd.DataFrame(
        {
            "number_inpatient": [2, 0],
            "number_outpatient": [1, 3],
            "time_in_hospital": [5, 4],
        }
    )
    result = add_utilisation_ratio_features(frame)
    # 2 / (1 + 1) = 1.0 ; 0 / (3 + 1) = 0.0 - the +1 smoothing avoids a
    # division by zero for a patient with no prior outpatient visits.
    assert list(result["inpatient_outpatient_ratio"]) == [1.0, 0.0]
    assert list(result["inpatient_stay_interaction"]) == [10, 0]


def test_utilisation_ratio_missing_columns_is_a_no_op() -> None:
    """A frame missing any of the three required columns is returned unchanged."""
    frame = pd.DataFrame({"time_in_hospital": [3]})
    result = add_utilisation_ratio_features(frame)
    assert "inpatient_outpatient_ratio" not in result.columns
    assert "inpatient_stay_interaction" not in result.columns


def test_any_medication_change_flag_thresholds_the_count() -> None:
    """Lever 3: the flag is 1 for any positive count, 0 for none."""
    frame = pd.DataFrame({"num_med_changes": [0, 1, 3]})
    result = add_any_medication_change_flag(frame)
    assert list(result["any_med_change"]) == [0, 1, 1]


def test_number_diagnoses_binning_is_ordinal_and_drops_the_raw_count() -> None:
    """Lever 4a: the raw count is replaced, not kept alongside the bin."""
    frame = pd.DataFrame({"number_diagnoses": [1, 4, 7, 15]})
    result = bin_number_diagnoses(frame)
    assert "number_diagnoses" not in result.columns
    assert list(result["number_diagnoses_binned"]) == [0, 1, 2, 3]


def test_ordinal_age_drops_one_hot_columns_keeps_numeric() -> None:
    """Lever 4b: age and age_group (both one-hot categorical) are dropped."""
    frame = pd.DataFrame(
        {
            "age": ["[70-80)"],
            "age_group": ["60+"],
            "age_numeric": [75],
        }
    )
    result = use_ordinal_age_only(frame)
    assert "age" not in result.columns
    assert "age_group" not in result.columns
    assert list(result["age_numeric"]) == [75]
