"""Tests for the Milestone 1 preprocessing pipeline.

These pin the decisions that make the difference between a model that scores
well and a model that is actually useful.
"""

import pandas as pd
import pytest

from src.data.load_data import binarise_target
from src.data.mappings import (
    NON_READMITTABLE_DISPOSITIONS,
    group_diagnosis,
    midpoint_of_age_bracket,
    parse_age_bracket,
)
from src.data.preprocess import (
    basic_clean,
    decode_id_columns,
    deduplicate_patients,
    drop_non_readmittable,
    engineer_columns,
    summarise,
)


@pytest.fixture
def raw_frame() -> pd.DataFrame:
    """A small frame shaped like the real dataset."""
    return pd.DataFrame(
        {
            "encounter_id": [1, 2, 3, 4, 5],
            "patient_nbr": [100, 100, 200, 300, 400],
            "age": ["[70-80)", "[70-80)", "[50-60)", "[80-90)", "[10-20)"],
            "gender": ["Female", "Female", "Male", "Male", "Female"],
            "admission_type_id": [1, 3, 2, 1, 7],
            "discharge_disposition_id": [1, 1, 11, 6, 1],
            "admission_source_id": [7, 1, 7, 4, 7],
            "time_in_hospital": [3, 5, 2, 8, 1],
            "number_outpatient": [0, 1, 0, 2, 0],
            "number_emergency": [1, 0, 0, 3, 0],
            "number_inpatient": [2, 1, 0, 1, 0],
            "diag_1": ["250.83", "428", "486", "V57", "?"],
            "readmitted": ["<30", "NO", "NO", ">30", "<30"],
        }
    )


# --------------------------------------------------------------------------
# Target handling
# --------------------------------------------------------------------------


def test_only_readmission_within_30_days_is_positive() -> None:
    """The brief targets 30-day readmission - ">30" and "NO" are both negative."""
    series = pd.Series(["<30", ">30", "NO", "<30"])
    assert binarise_target(series).tolist() == [1, 0, 0, 1]


def test_engineered_target_matches_binarise_target(raw_frame: pd.DataFrame) -> None:
    """The two paths to the label must never disagree."""
    engineered = engineer_columns(raw_frame)["readmitted_within_30_days"]
    assert engineered.tolist() == binarise_target(raw_frame["readmitted"]).tolist()


# --------------------------------------------------------------------------
# Leakage guards - the two steps that matter most
# --------------------------------------------------------------------------


def test_encounters_that_cannot_be_readmitted_are_removed(raw_frame: pd.DataFrame) -> None:
    """A patient who died cannot be readmitted; keeping the row leaks the target."""
    filtered, removed = drop_non_readmittable(raw_frame)

    assert removed == 1
    assert 11 not in filtered["discharge_disposition_id"].tolist()
    assert not set(filtered["discharge_disposition_id"]) & NON_READMITTABLE_DISPOSITIONS


def test_every_non_readmittable_disposition_is_covered() -> None:
    """Death and hospice codes must all be listed, not just 'Expired'."""
    assert frozenset({11, 13, 14, 19, 20, 21}) == NON_READMITTABLE_DISPOSITIONS


def test_repeat_encounters_are_deduplicated(raw_frame: pd.DataFrame) -> None:
    """Encounters from one patient are not independent observations."""
    deduped, removed = deduplicate_patients(raw_frame)

    assert removed == 1
    assert deduped["patient_nbr"].is_unique
    # The earliest encounter is the one kept.
    assert deduped.loc[deduped["patient_nbr"] == 100, "encounter_id"].item() == 1


def test_cleaning_drops_the_identifier_columns_by_default(raw_frame: pd.DataFrame) -> None:
    """The training pipeline must never see patient_nbr or encounter_id."""
    config = {"preprocessing": {"drop_columns": ["encounter_id", "patient_nbr"]}}
    cleaned = basic_clean(raw_frame, config)

    assert "patient_nbr" not in cleaned.columns
    assert "encounter_id" not in cleaned.columns


def test_the_etl_can_keep_the_identifier_columns(raw_frame: pd.DataFrame) -> None:
    """The ETL needs patient_nbr to build the medical record number."""
    config = {"preprocessing": {"drop_columns": ["encounter_id", "patient_nbr"]}}
    cleaned = basic_clean(raw_frame, config, drop_columns=False)

    assert "patient_nbr" in cleaned.columns


# --------------------------------------------------------------------------
# Decoding and feature engineering
# --------------------------------------------------------------------------


def test_id_columns_are_decoded_to_descriptions(raw_frame: pd.DataFrame) -> None:
    """The opaque integer ids become readable values for the dashboards."""
    decoded = decode_id_columns(raw_frame)

    assert decoded["admission_type"].tolist() == [
        "Emergency",
        "Elective",
        "Urgent",
        "Emergency",
        "Trauma Center",
    ]
    assert decoded["discharge_disposition"].iloc[2] == "Expired"
    assert decoded["admission_source"].iloc[0] == "Emergency Room"


def test_an_unknown_id_decodes_to_unknown_rather_than_nan() -> None:
    """An id outside the lookup must not silently become a null."""
    frame = pd.DataFrame({"admission_type_id": [999]})
    assert decode_id_columns(frame)["admission_type"].iloc[0] == "Unknown"


def test_prior_utilisation_is_summed(raw_frame: pd.DataFrame) -> None:
    """Prior visits are the strongest readmission signal in this dataset."""
    engineered = engineer_columns(raw_frame)
    assert engineered["prior_visits_total"].tolist() == [3, 2, 0, 6, 0]


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        ("250.83", "Diabetes"),
        ("250", "Diabetes"),
        ("428", "Circulatory"),
        ("486", "Respiratory"),
        ("571", "Digestive"),
        ("V57", "Other"),
        ("E909", "Other"),
        ("?", "Missing"),
        ("", "Missing"),
        (None, "Missing"),
    ],
)
def test_diagnosis_codes_map_to_clinical_groups(code: str | None, expected: str) -> None:
    """ICD-9 grouping follows the published analysis of this dataset."""
    assert group_diagnosis(code) == expected


@pytest.mark.parametrize(
    ("bracket", "normalised", "midpoint"),
    [("[70-80)", "70-80", 75.0), ("[0-10)", "0-10", 5.0), (None, None, None)],
)
def test_age_brackets_are_normalised(
    bracket: str | None, normalised: str | None, midpoint: float | None
) -> None:
    """The dataset's "[70-80)" becomes a clean label and a usable number."""
    assert parse_age_bracket(bracket) == normalised
    assert midpoint_of_age_bracket(bracket) == midpoint


# --------------------------------------------------------------------------
# End to end
# --------------------------------------------------------------------------


def test_full_clean_removes_both_leakage_sources(raw_frame: pd.DataFrame) -> None:
    """5 rows in: one expired encounter and one repeat patient come out."""
    config = {
        "preprocessing": {
            "drop_columns": ["encounter_id", "patient_nbr"],
            "deduplicate_patients": True,
            "drop_non_readmittable": True,
        }
    }
    cleaned = basic_clean(raw_frame, config)

    assert len(cleaned) == 3
    assert "readmitted_within_30_days" in cleaned.columns
    assert "age_group" in cleaned.columns


def test_summarise_reports_the_class_balance(raw_frame: pd.DataFrame) -> None:
    """The write-up needs the positive rate, not just the row count."""
    report = summarise(engineer_columns(raw_frame))

    assert report["rows"] == 5
    assert report["positives"] == 2
    assert report["positive_rate"] == 0.4
