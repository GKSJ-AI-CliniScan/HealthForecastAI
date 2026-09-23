"""Tests for row-level schema/plausibility validation."""

import pandas as pd

from src.data.validate import validate_frame

INDIA_PROFILE = {
    "id_column": "patient_id",
    "date_column": "admission_date",
    "discharge_date_column": "discharge_date",
}


def test_valid_rows_pass_through_untouched() -> None:
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P2"],
            "age": [61, 44],
            "admission_date": ["2024-01-01", "2024-02-01"],
            "discharge_date": ["2024-01-05", "2024-02-03"],
        }
    )
    valid, reasons = validate_frame(frame, INDIA_PROFILE)
    assert len(valid) == 2
    assert reasons == {}


def test_missing_patient_identifier_is_rejected() -> None:
    frame = pd.DataFrame({"patient_id": ["P1", None, ""], "age": [61, 44, 30]})
    valid, reasons = validate_frame(frame, INDIA_PROFILE)
    assert len(valid) == 1
    assert reasons == {"missing_patient_identifier": 2}


def test_implausible_age_is_rejected() -> None:
    frame = pd.DataFrame({"patient_id": ["P1", "P2", "P3"], "age": [61, -5, 200]})
    valid, reasons = validate_frame(frame, INDIA_PROFILE)
    assert valid["patient_id"].tolist() == ["P1"]
    assert reasons == {"implausible_age": 2}


def test_boundary_ages_are_accepted() -> None:
    frame = pd.DataFrame({"patient_id": ["P1", "P2"], "age": [0, 130]})
    valid, reasons = validate_frame(frame, INDIA_PROFILE)
    assert len(valid) == 2
    assert reasons == {}


def test_discharge_before_admission_is_rejected() -> None:
    frame = pd.DataFrame(
        {
            "patient_id": ["P1", "P2"],
            "age": [61, 44],
            "admission_date": ["2024-03-10", "2024-04-01"],
            "discharge_date": ["2024-03-01", "2024-04-05"],
        }
    )
    valid, reasons = validate_frame(frame, INDIA_PROFILE)
    assert valid["patient_id"].tolist() == ["P2"]
    assert reasons == {"discharge_before_admission": 1}


def test_a_row_rejected_for_one_reason_is_not_double_counted() -> None:
    """A row failing two checks is dropped once and attributed to its first failure."""
    frame = pd.DataFrame(
        {
            "patient_id": [None],
            "age": [999],
            "admission_date": ["2024-03-10"],
            "discharge_date": ["2024-03-01"],
        }
    )
    valid, reasons = validate_frame(frame, INDIA_PROFILE)
    assert len(valid) == 0
    assert sum(reasons.values()) == 1


def test_missing_date_columns_are_skipped_without_erroring() -> None:
    """A profile without both date columns (Diabetes 130-US) just skips that check."""
    frame = pd.DataFrame({"patient_id": ["P1"], "age": [61]})
    profile = {"id_column": "patient_id", "date_column": None, "discharge_date_column": None}
    valid, reasons = validate_frame(frame, profile)
    assert len(valid) == 1
    assert reasons == {}
