"""Tests for the shared cleaning rules.

docs/07-testing: test the transformations, not the model's accuracy.
"""

import pandas as pd

from src.data.preprocess import (
    EXPIRED_OR_HOSPICE_DISPOSITIONS,
    basic_clean,
    bucket_age,
    collapse_rare_categories,
    drop_duplicate_encounters,
    drop_unused_columns,
    remove_expired_encounters,
)

DIABETES_PROFILE = {
    "id_column": "patient_nbr",
    "date_column": None,
    "encounter_key": "encounter_id",
    "leakage_disposition_column": "discharge_disposition_id",
    "collapse_columns": ["diag_1"],
}

INDIA_PROFILE = {
    "id_column": "patient_id",
    "date_column": "admission_date",
    "encounter_key": None,
    "leakage_disposition_column": None,
    "collapse_columns": ["diagnosis"],
}


def test_expired_and_hospice_encounters_are_removed() -> None:
    """These patients cannot be readmitted, so their label leaks the target."""
    frame = pd.DataFrame({"discharge_disposition_id": [1, 11, 3, 14], "x": [1, 2, 3, 4]})
    kept = remove_expired_encounters(frame)
    assert kept["discharge_disposition_id"].tolist() == [1, 3]


def test_every_expired_code_is_filtered() -> None:
    """No code in the documented set survives the filter."""
    frame = pd.DataFrame(
        {"discharge_disposition_id": sorted(EXPIRED_OR_HOSPICE_DISPOSITIONS) + [1]}
    )
    assert remove_expired_encounters(frame)["discharge_disposition_id"].tolist() == [1]


def test_removal_is_a_no_op_without_the_column() -> None:
    """An export lacking the column is passed through untouched."""
    frame = pd.DataFrame({"x": [1, 2]})
    assert len(remove_expired_encounters(frame)) == 2


def test_removal_is_a_no_op_when_disposition_column_is_none() -> None:
    """The India profile has no death/hospice signal - explicitly disabled, not guessed."""
    frame = pd.DataFrame({"discharge_disposition_id": [1, 11], "x": [1, 2]})
    kept = remove_expired_encounters(frame, disposition_column=None)
    assert len(kept) == 2


def test_age_band_becomes_its_lower_bound() -> None:
    """'[70-80)' must order after '[0-10)', which string encoding would lose."""
    frame = pd.DataFrame({"age": ["[70-80)", "[0-10)"]})
    assert bucket_age(frame)["age"].tolist() == [70, 0]


def test_age_bucketing_is_harmless_on_already_numeric_age() -> None:
    """The India export's age column is already numeric, not a band string."""
    frame = pd.DataFrame({"age": [61, 44]})
    assert bucket_age(frame)["age"].tolist() == [61, 44]


def test_rare_categories_collapse_into_other() -> None:
    """A long diagnosis tail would otherwise become hundreds of empty columns."""
    frame = pd.DataFrame({"diag_1": ["A"] * 99 + ["Z"]})
    collapsed = collapse_rare_categories(frame, ["diag_1"], threshold=0.05)
    assert set(collapsed["diag_1"]) == {"A", "Other"}


def test_common_categories_are_left_alone() -> None:
    """Collapsing must not touch values that carry real signal."""
    frame = pd.DataFrame({"diag_1": ["A"] * 50 + ["B"] * 50})
    collapsed = collapse_rare_categories(frame, ["diag_1"], threshold=0.05)
    assert set(collapsed["diag_1"]) == {"A", "B"}


def test_drop_unused_columns_only_drops_present_columns() -> None:
    """A column named in the profile but absent from the export is not an error."""
    frame = pd.DataFrame({"a": [1], "b": [2]})
    dropped = drop_unused_columns(frame, ["a", "does_not_exist"])
    assert list(dropped.columns) == ["b"]


def test_duplicate_encounters_are_dropped_by_encounter_key() -> None:
    """Diabetes 130-US identifies an encounter by its own id column."""
    frame = pd.DataFrame({"encounter_id": [1, 1, 2], "x": ["a", "a", "b"]})
    deduped = drop_duplicate_encounters(frame, DIABETES_PROFILE)
    assert len(deduped) == 2


def test_duplicate_encounters_are_dropped_by_patient_and_date_pair() -> None:
    """India Hospital Readmission has no encounter id - use (patient, date) instead."""
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P1", "P2"],
            "admission_date": ["2024-01-01", "2024-01-01", "2024-01-01"],
        }
    )
    deduped = drop_duplicate_encounters(frame, INDIA_PROFILE)
    assert len(deduped) == 2


def test_deduplication_never_collapses_a_patients_real_admission_history() -> None:
    """The same patient with two different admission dates is two real rows."""
    frame = pd.DataFrame(
        {"patient_id": ["P1", "P1"], "admission_date": ["2024-01-01", "2024-06-01"]}
    )
    deduped = drop_duplicate_encounters(frame, INDIA_PROFILE)
    assert len(deduped) == 2


def test_basic_clean_removes_expired_rows_before_anything_else() -> None:
    """No later statistic may be fitted on rows that will not be trained on."""
    frame = pd.DataFrame(
        {
            "discharge_disposition_id": [1, 11],
            "age": ["[70-80)", "[60-70)"],
            "diag_1": ["250", "428"],
            "encounter_id": [1, 2],
        }
    )
    cleaned = basic_clean(frame, DIABETES_PROFILE)
    assert len(cleaned) == 1
    assert cleaned["age"].tolist() == [70]


def test_basic_clean_leaves_identifier_columns_in_place_for_the_india_profile() -> None:
    """Column pruning is a separate, later step - see drop_unused_columns in train.py."""
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P2"],
            "admission_date": ["2024-01-01", "2024-02-01"],
            "diagnosis": ["Cardiac", "Cardiac"],
            "age": [61, 44],
        }
    )
    cleaned = basic_clean(frame, INDIA_PROFILE)
    assert "patient_id" in cleaned.columns
    assert "admission_date" in cleaned.columns
