"""Tests for the milestone-1 domain cleaning rules.

docs/07-testing: test the transformations, not the model's accuracy.
"""

import pandas as pd

from src.data.preprocess import (
    EXPIRED_OR_HOSPICE_DISPOSITIONS,
    basic_clean,
    bucket_age,
    collapse_rare_categories,
    remove_expired_encounters,
)


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


def test_age_band_becomes_its_lower_bound() -> None:
    """'[70-80)' must order after '[0-10)', which string encoding would lose."""
    frame = pd.DataFrame({"age": ["[70-80)", "[0-10)"]})
    assert bucket_age(frame)["age"].tolist() == [70, 0]


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
    cleaned = basic_clean(frame, {"preprocessing": {"drop_columns": ["encounter_id"]}})
    assert len(cleaned) == 1
    assert "encounter_id" not in cleaned.columns
    assert cleaned["age"].tolist() == [70]
