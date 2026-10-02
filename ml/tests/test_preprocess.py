"""Tests for the Milestone 1 cleaning and feature logic.

Every test builds its own small frame, so the suite runs in CI without the
dataset present - datasets are never committed to this repository.
"""

from __future__ import annotations

import pandas as pd

from src.data.load_data import binarise_target
from src.data.preprocess import (
    add_age_features,
    add_diagnosis_groups,
    drop_constant_columns,
    fill_missing_as_category,
    group_icd9_code,
    keep_first_encounter_per_patient,
    remove_death_and_hospice,
)
from src.features.build_features import (
    add_medication_features,
    add_prior_visit_features,
    find_medication_columns,
)


def test_death_and_hospice_encounters_are_removed() -> None:
    """Dispositions meaning death or hospice must not reach the model."""
    frame = pd.DataFrame({"discharge_disposition_id": [1, 11, 13, 3, 20]})
    result = remove_death_and_hospice(frame)
    assert list(result["discharge_disposition_id"]) == [1, 3]


def test_only_the_first_encounter_per_patient_is_kept() -> None:
    """Repeat admissions by one patient would leak across the train/test split."""
    frame = pd.DataFrame(
        {
            "encounter_id": [5, 1, 9, 3],
            "patient_nbr": [100, 100, 200, 200],
        }
    )
    result = keep_first_encounter_per_patient(frame)
    assert len(result) == 2
    assert sorted(result["encounter_id"]) == [1, 3]


def test_target_counts_only_readmission_within_thirty_days() -> None:
    """Both ">30" and "NO" are negative outcomes for a 30-day target."""
    series = pd.Series(["<30", ">30", "NO", "<30"])
    assert list(binarise_target(series)) == [1, 0, 0, 1]


def test_constant_columns_are_dropped() -> None:
    """A column with one distinct value carries no information."""
    frame = pd.DataFrame({"keep": [1, 2, 3], "constant": ["x", "x", "x"]})
    result, dropped = drop_constant_columns(frame)
    assert dropped == ["constant"]
    assert list(result.columns) == ["keep"]


def test_missing_values_become_an_explicit_category() -> None:
    """Absence is informative for these columns, so it is labelled, not imputed."""
    frame = pd.DataFrame({"medical_specialty": ["Cardiology", None], "race": [None, "Other"]})
    result = fill_missing_as_category(frame)
    assert result["medical_specialty"].tolist() == ["Cardiology", "Missing"]
    assert result["race"].tolist() == ["Missing", "Other"]


def test_icd9_codes_map_to_clinical_groups() -> None:
    """Roughly 850 raw codes collapse into a small set of learnable groups."""
    assert group_icd9_code("250.83") == "Diabetes"
    assert group_icd9_code("410") == "Circulatory"
    assert group_icd9_code("785") == "Circulatory"
    assert group_icd9_code("V45") == "Other"
    assert group_icd9_code("Missing") == "Missing"


def test_diagnosis_group_columns_are_added() -> None:
    """Each diagnosis field gains a grouped companion column."""
    frame = pd.DataFrame({"diag_1": ["250.1"], "diag_2": ["410"], "diag_3": ["Missing"]})
    result = add_diagnosis_groups(frame)
    assert result["diag_1_group"].iloc[0] == "Diabetes"
    assert result["diag_3_group"].iloc[0] == "Missing"


def test_age_bracket_becomes_numeric_and_banded() -> None:
    """The bracket string is unusable as a feature until it is converted."""
    frame = pd.DataFrame({"age": ["[70-80)", "[20-30)"]})
    result = add_age_features(frame)
    assert result["age_numeric"].tolist() == [75, 25]
    assert result["age_group"].tolist() == ["60+", "<30"]


def test_medication_columns_are_detected_by_their_values() -> None:
    """Drug columns are found by their dosage vocabulary, not a hardcoded list."""
    frame = pd.DataFrame(
        {
            "metformin": ["No", "Up", "Steady"],
            "insulin": ["Down", "No", "Steady"],
            "age": [45, 55, 65],
        }
    )
    assert set(find_medication_columns(frame)) == {"metformin", "insulin"}


def test_medication_features_count_changes_and_prescriptions() -> None:
    """Dosage changes proxy for an unstable patient."""
    frame = pd.DataFrame({"metformin": ["Up", "No"], "insulin": ["Steady", "Down"]})
    result = add_medication_features(frame)
    assert result["num_med_changes"].tolist() == [1, 1]
    assert result["num_meds_prescribed"].tolist() == [2, 1]


def test_prior_visits_are_summed() -> None:
    """Prior utilisation is one of the strongest readmission signals."""
    frame = pd.DataFrame(
        {
            "number_outpatient": [1, 0],
            "number_emergency": [2, 0],
            "number_inpatient": [3, 1],
        }
    )
    result = add_prior_visit_features(frame)
    assert result["total_prior_visits"].tolist() == [6, 1]
