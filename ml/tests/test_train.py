"""Tests for the leakage safety net in src.models.train (N2 / C4).

These are unit-level and need no raw dataset on disk, so they run in CI even
though the full training run (which does need the raw CSV) does not.
"""

import pytest

from src.models.train import (
    FORBIDDEN_FEATURE_COLUMNS,
    assert_no_leaked_columns,
    positive_class_weight,
)


def test_forbidden_columns_match_the_m2_contract() -> None:
    """The exact four columns C4 names - not a superset, not a subset."""
    assert set(FORBIDDEN_FEATURE_COLUMNS) == {
        "readmitted",
        "readmitted_30d",
        "encounter_id",
        "patient_nbr",
    }


def test_clean_feature_list_passes() -> None:
    """A feature list containing none of the four forbidden columns is silent."""
    assert_no_leaked_columns(["age", "race", "num_medications"])  # no raise


@pytest.mark.parametrize("leaked_column", list(FORBIDDEN_FEATURE_COLUMNS))
def test_each_forbidden_column_is_individually_caught(leaked_column: str) -> None:
    """Every one of the four columns is checked, not just the first."""
    with pytest.raises(AssertionError, match=leaked_column):
        assert_no_leaked_columns(["age", "race", leaked_column])


def test_multiple_leaked_columns_are_all_named_in_the_error() -> None:
    """The error names every leak found, not just the first, so a fix is one pass."""
    with pytest.raises(AssertionError) as excinfo:
        assert_no_leaked_columns(["age", "readmitted", "patient_nbr"])
    assert "readmitted" in str(excinfo.value)
    assert "patient_nbr" in str(excinfo.value)


def test_positive_class_weight_is_negatives_over_positives() -> None:
    """900 negatives to 100 positives is a 9.0 ratio, matching XGBoost's scale_pos_weight semantics."""
    y = [0] * 900 + [1] * 100
    assert positive_class_weight(y) == pytest.approx(9.0)


def test_positive_class_weight_rejects_no_positives() -> None:
    """A training split with zero positive examples cannot compute a ratio."""
    with pytest.raises(ValueError, match="no positive examples"):
        positive_class_weight([0, 0, 0])
