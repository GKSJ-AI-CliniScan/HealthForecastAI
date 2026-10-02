"""Tests for the recovery score and the treatment effectiveness statistics.

The recovery score cases matter more than they look: the score is shown to
clinicians as a single number, so "which components were available" has to be
handled the same way every time or the same patient scores differently on two
screens.
"""

import pandas as pd
import pytest

from src.evaluation.treatment import (
    a1c_and_medication_change,
    group_outcomes,
    recovery_components,
    recovery_score,
    treatment_effectiveness,
    wilson_interval,
)
from src.utils.config import load_config


@pytest.fixture(scope="module")
def config() -> dict:
    """The real config, so the tests check the shipped weights, not invented ones."""
    return load_config()


def test_all_three_components_present(config: dict) -> None:
    """A best-case row scores 100: no readmission, one day, normal A1C."""
    row = pd.Series({"readmitted": "NO", "time_in_hospital": 1, "A1Cresult": "Norm"})
    assert recovery_score(row, config) == 100.0


def test_worst_case_scores_zero(config: dict) -> None:
    """Readmitted early, longest stay, worst A1C."""
    row = pd.Series({"readmitted": "<30", "time_in_hospital": 14, "A1Cresult": ">8"})
    assert recovery_score(row, config) == 0.0


def test_a1c_none_drops_the_component_and_renormalises(config: dict) -> None:
    """The dataset's literal "None" means the test was never run, not a bad result.

    With A1C dropped the weights are 0.50 and 0.25, re-normalised to 2/3 and 1/3.
    A row that is perfect on both must still score 100, not 75.
    """
    row = pd.Series({"readmitted": "NO", "time_in_hospital": 1, "A1Cresult": "None"})
    assert "a1c_result" not in recovery_components(row, config)
    assert recovery_score(row, config) == 100.0


def test_a1c_missing_behaves_like_not_tested(config: dict) -> None:
    """A genuinely absent A1C value is dropped the same way "None" is."""
    row = pd.Series({"readmitted": ">30", "time_in_hospital": 1, "A1Cresult": None})
    without_key = pd.Series({"readmitted": ">30", "time_in_hospital": 1})
    assert recovery_score(row, config) == recovery_score(without_key, config)


def test_an_all_null_row_scores_none_not_zero(config: dict) -> None:
    """No component available means unknown, which is not the same as worst.

    Returning 0.0 here would put a patient nobody has data for at the bottom of
    a sorted dashboard, next to the genuinely worst outcomes.
    """
    row = pd.Series({"readmitted": None, "time_in_hospital": None, "A1Cresult": None})
    assert recovery_score(row, config) is None


def test_unmapped_readmitted_value_is_dropped(config: dict) -> None:
    """An unexpected outcome string drops that component rather than guessing."""
    row = pd.Series({"readmitted": "maybe", "time_in_hospital": 1, "A1Cresult": "Norm"})
    components = recovery_components(row, config)
    assert "readmitted" not in components
    assert set(components) == {"time_in_hospital", "a1c_result"}


@pytest.mark.parametrize("days,expected", [(0, 100.0), (1, 100.0), (14, 0.0), (30, 0.0)])
def test_stay_outside_the_configured_range_is_clamped(
    config: dict, days: int, expected: float
) -> None:
    """A 30-day stay is the worst case the score can express, not an error."""
    row = pd.Series({"time_in_hospital": days})
    assert recovery_score(row, config) == expected


def test_a_non_numeric_stay_is_dropped(config: dict) -> None:
    """A junk length of stay drops its component instead of raising."""
    row = pd.Series({"readmitted": "NO", "time_in_hospital": "unknown"})
    assert recovery_components(row, config) == {"readmitted": 1.0}


def test_wilson_interval_brackets_the_rate() -> None:
    """The interval contains the observed rate and stays inside 0 to 1."""
    low, high = wilson_interval(10, 100)
    assert 0.0 <= low < 0.10 < high <= 1.0


def test_wilson_interval_stays_in_range_for_zero_events() -> None:
    """Zero events is where the textbook normal interval goes negative."""
    low, high = wilson_interval(0, 20)
    assert low == 0.0
    assert 0.0 < high < 1.0


def test_wilson_interval_of_an_empty_group_is_not_an_error() -> None:
    """An empty group returns a degenerate interval rather than dividing by zero."""
    assert wilson_interval(0, 0) == [0.0, 0.0]


def _frame() -> pd.DataFrame:
    """A small frame with a deliberate split between the two change groups."""
    return pd.DataFrame(
        {
            "readmitted": ["<30", ">30", "NO", "<30", "NO", "NO"],
            "change": ["Ch", "Ch", "Ch", "No", "No", "No"],
            "A1Cresult": ["Norm", "None", ">8", "None", "None", "None"],
            "time_in_hospital": [3, 4, 2, 5, 1, 2],
            "diabetesMed": ["Yes", "Yes", "No", "Yes", "No", "No"],
        }
    )


def test_group_outcomes_counts_both_rates(config: dict) -> None:
    """The 30-day rate and the any-readmission rate are counted separately."""
    result = group_outcomes(_frame(), "change", config)
    groups = {group["value"]: group for group in result["groups"]}
    assert groups["Ch"]["n"] == 3
    assert groups["Ch"]["readmitted_30d"] == 1
    assert groups["Ch"]["readmitted_any"] == 2
    assert groups["No"]["readmitted_30d"] == 1
    assert groups["No"]["readmitted_any"] == 1


def test_small_groups_are_flagged_not_dropped(config: dict) -> None:
    """Every group here is under 30 rows, so all of them say so and none vanish."""
    result = group_outcomes(_frame(), "change", config)
    assert len(result["groups"]) == 2
    assert all(group["reliable"] is False for group in result["groups"])


def test_chi_square_is_null_when_there_is_only_one_group(config: dict) -> None:
    """One group cannot be tested against anything, so no p-value is invented."""
    frame = _frame()
    frame["change"] = "Ch"
    result = group_outcomes(frame, "change", config)
    assert result["chi_square_30d"]["p_value"] is None


def test_a1c_and_medication_change_is_labelled_as_an_association(config: dict) -> None:
    """The output must never read as a measured HbA1c improvement."""
    result = a1c_and_medication_change(_frame(), config)
    assert "not a measured HbA1c reduction" in result["measures"]
    assert any("a1c tested" in group["value"] for group in result["groups"])


def test_treatment_effectiveness_skips_a_constant_medication_column(config: dict) -> None:
    """A drug that is "No" for everyone carries no comparison, so it is left out."""
    frame = _frame()
    frame["insulin"] = "No"
    frame["metformin"] = ["Up", "No", "Steady", "No", "Down", "No"]
    result = treatment_effectiveness(frame, config, ["insulin", "metformin"])
    assert "insulin" not in result["medications"]
    assert "metformin" in result["medications"]
