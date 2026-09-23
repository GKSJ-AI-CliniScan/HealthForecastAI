"""Tests for raw loading and target construction."""

import pandas as pd
import pytest

from src.data.load_data import binarise_readmission_target, binarise_risk_target, load_raw


def test_missing_file_explains_where_to_get_it(tmp_path) -> None:
    """The error points at the download instructions rather than a bare traceback."""
    with pytest.raises(FileNotFoundError, match="ml/data/README.md"):
        load_raw(tmp_path / "does-not-exist.csv")


def test_default_na_values_matches_diabetes_convention(tmp_path) -> None:
    """Without an explicit na_values list, '?' is treated as missing.

    keep_default_na=True is left on, so pandas' own built-in NA tokens (which
    already include "NA") still apply on top of the custom list - this checks
    the '?' token specifically, using a value that is not one of pandas'
    defaults to isolate it.
    """
    csv_path = tmp_path / "diabetes_like.csv"
    csv_path.write_text("age,gender\n?,Female\n[50-60),Unknown/Invalid\n", encoding="utf-8")
    frame = load_raw(csv_path)
    assert frame["age"].isna().tolist() == [True, False]
    assert frame["gender"].tolist() == ["Female", "Unknown/Invalid"]


def test_custom_na_values_matches_the_india_profiles_wider_token_set(tmp_path) -> None:
    """The India profile's na_values list must be honoured, not the '?' default."""
    csv_path = tmp_path / "india_like.csv"
    csv_path.write_text("age,gender\n?,Female\n44,Unknown/Invalid\n", encoding="utf-8")
    frame = load_raw(csv_path, na_values=["?", "Unknown/Invalid"])
    assert frame["age"].isna().tolist() == [True, False]
    assert frame["gender"].isna().tolist() == [False, True]


@pytest.mark.parametrize(
    ("value", "expected"),
    [("<30", 1), (">30", 0), ("NO", 0)],
)
def test_readmission_target_is_true_only_within_30_days(value: str, expected: int) -> None:
    """The readmission model's label is strictly the 30-day horizon."""
    series = pd.Series([value])
    assert binarise_readmission_target(series).tolist() == [expected]


@pytest.mark.parametrize(
    ("value", "expected"),
    [("<30", 1), (">30", 1), ("NO", 0)],
)
def test_risk_target_is_true_for_any_readmission(value: str, expected: int) -> None:
    """The risk model's label is broader: any readmission counts, not just <30 days."""
    series = pd.Series([value])
    assert binarise_risk_target(series).tolist() == [expected]


def test_risk_and_readmission_targets_are_genuinely_different_labels() -> None:
    """A '>30' row must be positive for risk but negative for readmission."""
    series = pd.Series(["<30", ">30", "NO"])
    readmission = binarise_readmission_target(series)
    risk = binarise_risk_target(series)
    assert readmission.tolist() == [1, 0, 0]
    assert risk.tolist() == [1, 1, 0]
    assert readmission.tolist() != risk.tolist()
