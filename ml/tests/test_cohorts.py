"""Tests for the ICD-9 cohort mapping and the cohort breakdown."""

import pandas as pd
import pytest

from src.evaluation.cohorts import (
    DIAGNOSIS_LABELS,
    add_diagnosis_cohort,
    cohort_analytics,
    cohort_metrics,
    diagnosis_group,
)
from src.utils.config import load_config


@pytest.fixture(scope="module")
def config() -> dict:
    """The real config, so min_size is the shipped value."""
    return load_config()


@pytest.mark.parametrize(
    "code,expected",
    [
        ("428", "circulatory"),
        ("785", "circulatory"),
        ("486", "respiratory"),
        ("786", "respiratory"),
        ("562", "digestive"),
        ("250.83", "diabetes"),
        ("250", "diabetes"),
        ("820", "injury"),
        ("715", "musculoskeletal"),
        ("599", "genitourinary"),
        ("788", "genitourinary"),
        ("199", "neoplasms"),
        ("V57", "other"),
        ("E909", "other"),
        ("Missing", "missing"),
    ],
)
def test_icd9_codes_map_to_the_expected_group(code: str, expected: str) -> None:
    """One case per branch of the mapping, including the out-of-range singles."""
    assert diagnosis_group(code) == expected


def test_diabetes_range_is_exclusive_at_251() -> None:
    """250.x is diabetes; 251 is not. The boundary is worth pinning down."""
    assert diagnosis_group("250.99") == "diabetes"
    assert diagnosis_group("251") != "diabetes"


def test_every_group_the_milestone_names_is_reachable() -> None:
    """The nine named groups all exist in the label table, plus the data gap."""
    named = {
        "circulatory",
        "respiratory",
        "digestive",
        "diabetes",
        "injury",
        "musculoskeletal",
        "genitourinary",
        "neoplasms",
        "other",
    }
    assert named.issubset(set(DIAGNOSIS_LABELS.values()))
    assert "missing" in DIAGNOSIS_LABELS.values()


def test_cohort_column_prefers_the_precomputed_group() -> None:
    """On a cleaned frame the existing diag_1_group column is reused, not recomputed."""
    frame = pd.DataFrame({"diag_1": ["428"], "diag_1_group": ["Respiratory"]})
    result = add_diagnosis_cohort(frame)
    assert result["diagnosis_cohort"].iloc[0] == "respiratory"


def test_cohort_column_falls_back_to_the_raw_code() -> None:
    """A raw frame with no group column is still mappable."""
    frame = pd.DataFrame({"diag_1": ["428", "V57"]})
    result = add_diagnosis_cohort(frame)
    assert result["diagnosis_cohort"].tolist() == ["circulatory", "other"]


def _frame() -> pd.DataFrame:
    """Two age groups: one with enough rows to be reliable, one without."""
    return pd.DataFrame(
        {
            "readmitted": ["<30"] * 5 + ["NO"] * 30,
            "age": ["[70-80)"] * 5 + ["[60-70)"] * 30,
            "gender": ["Female"] * 35,
            "time_in_hospital": [3] * 35,
            "A1Cresult": ["None"] * 35,
            "diag_1_group": ["Circulatory"] * 35,
        }
    )


def test_small_cohorts_are_flagged_and_large_ones_are_not(config: dict) -> None:
    """The 5-row cohort is marked unreliable; the 30-row one clears the bar."""
    rows = {row["cohort"]: row for row in cohort_metrics(_frame(), "age", config)}
    assert rows["[70-80)"]["n"] == 5
    assert rows["[70-80)"]["reliable"] is False
    assert rows["[60-70)"]["n"] == 30
    assert rows["[60-70)"]["reliable"] is True


def test_a_small_cohort_is_reported_not_dropped(config: dict) -> None:
    """Dropping it would read as a cohort with no readmissions."""
    cohorts = [row["cohort"] for row in cohort_metrics(_frame(), "age", config)]
    assert "[70-80)" in cohorts


def test_cohort_rates_and_recovery_scores_are_computed(config: dict) -> None:
    """Every readmitted-early row sits in one cohort, so its rate is 1.0."""
    rows = {row["cohort"]: row for row in cohort_metrics(_frame(), "age", config)}
    assert rows["[70-80)"]["rate_30d"] == 1.0
    assert rows["[60-70)"]["rate_30d"] == 0.0
    # Same stay and no A1C in both, so the score difference is the outcome alone.
    assert rows["[60-70)"]["mean_recovery_score"] > rows["[70-80)"]["mean_recovery_score"]


def test_unscored_rows_are_excluded_from_the_mean_not_the_count(config: dict) -> None:
    """A row with no scoreable component still counts in n, but not in the mean."""
    frame = _frame()
    frame.loc[frame.index[0], ["readmitted", "time_in_hospital", "A1Cresult"]] = None
    rows = {row["cohort"]: row for row in cohort_metrics(frame, "age", config)}
    assert rows["[70-80)"]["n"] == 5
    assert rows["[70-80)"]["scored_rows"] == 4


def test_cohort_analytics_returns_every_configured_type(config: dict) -> None:
    """age, gender and diagnosis are present; race is absent from this frame."""
    result = cohort_analytics(_frame(), config)
    assert {"age", "gender", "diagnosis"}.issubset(set(result))
    assert result["diagnosis"][0]["cohort"] == "circulatory"
