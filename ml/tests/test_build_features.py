"""Tests for feature engineering: history features and utilisation features."""

import pandas as pd

from src.features.build_features import add_history_features, add_utilisation_features


def test_prior_admission_count_increments_per_patient_in_date_order() -> None:
    """The first admission on record has zero prior admissions, the next has one."""
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P1", "P2"],
            "admission_date": ["2024-01-15", "2024-01-01", "2024-01-01"],
        }
    )
    result = add_history_features(frame, "patient_id", "admission_date")
    # Row 0 (P1, 2024-01-15) is P1's SECOND admission chronologically.
    assert result["prior_admission_count"].tolist() == [1, 0, 0]


def test_days_since_last_discharge_is_the_gap_to_the_previous_admission() -> None:
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P1"],
            "admission_date": ["2024-01-01", "2024-01-15"],
        }
    )
    result = add_history_features(frame, "patient_id", "admission_date")
    row0 = result[result["admission_date"] == "2024-01-01"].iloc[0]
    row1 = result[result["admission_date"] == "2024-01-15"].iloc[0]
    assert pd.isna(row0["days_since_last_discharge"])
    assert row1["days_since_last_discharge"] == 14


def test_a_single_admission_patient_has_no_history() -> None:
    frame = pd.DataFrame({"patient_id": ["P1"], "admission_date": ["2024-01-01"]})
    result = add_history_features(frame, "patient_id", "admission_date")
    assert result["prior_admission_count"].tolist() == [0]
    assert pd.isna(result["days_since_last_discharge"].iloc[0])


def test_history_features_never_see_a_later_admission() -> None:
    """A row's history features must only reflect admissions strictly before it."""
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P1", "P1"],
            "admission_date": ["2024-03-01", "2024-01-01", "2024-02-01"],
        }
    )
    result = add_history_features(frame, "patient_id", "admission_date")
    by_date = result.set_index("admission_date")["prior_admission_count"]
    assert by_date["2024-01-01"] == 0
    assert by_date["2024-02-01"] == 1
    assert by_date["2024-03-01"] == 2


def test_original_row_order_is_preserved() -> None:
    """The function must not silently reorder the caller's dataframe."""
    frame = pd.DataFrame(
        {"patient_id": ["P2", "P1"], "admission_date": ["2024-01-01", "2024-06-01"]}
    )
    result = add_history_features(frame, "patient_id", "admission_date")
    assert result["patient_id"].tolist() == ["P2", "P1"]


def test_is_a_no_op_without_a_usable_date_column() -> None:
    """Diabetes 130-US has no real calendar date - the profile passes date_column=None."""
    frame = pd.DataFrame({"patient_id": ["P1"], "x": [1]})
    result = add_history_features(frame, "patient_id", None)
    assert "prior_admission_count" not in result.columns
    assert "days_since_last_discharge" not in result.columns


def test_is_a_no_op_when_the_id_column_is_missing() -> None:
    frame = pd.DataFrame({"admission_date": ["2024-01-01"]})
    result = add_history_features(frame, "patient_id", "admission_date")
    assert "prior_admission_count" not in result.columns


def test_utilisation_total_is_summed_when_all_columns_present() -> None:
    frame = pd.DataFrame(
        {"number_outpatient": [1, 0], "number_emergency": [0, 2], "number_inpatient": [3, 1]}
    )
    result = add_utilisation_features(frame)
    assert result["prior_visits_total"].tolist() == [4, 3]


def test_utilisation_default_is_a_no_op_when_a_column_is_missing() -> None:
    frame = pd.DataFrame({"number_outpatient": [1]})
    result = add_utilisation_features(frame)
    assert "prior_visits_total" not in result.columns


def test_explicit_empty_utilisation_columns_stays_empty_not_the_diabetes_default() -> None:
    """The India profile's utilisation_columns: [] must not silently reactivate Diabetes columns."""
    frame = pd.DataFrame(
        {"number_outpatient": [1], "number_emergency": [0], "number_inpatient": [3]}
    )
    result = add_utilisation_features(frame, utilisation_columns=[])
    assert "prior_visits_total" not in result.columns


def test_a_custom_utilisation_column_list_is_honoured() -> None:
    frame = pd.DataFrame({"visits_a": [2], "visits_b": [3]})
    result = add_utilisation_features(frame, utilisation_columns=["visits_a", "visits_b"])
    assert result["prior_visits_total"].tolist() == [5]
