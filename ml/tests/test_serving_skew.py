"""Training path aur serving path ek hi row par same output den — ye saabit karo.

KYUN ye test sabse zaroori hai: training-serving skew silent hota hai. Model
theek, API theek, tests green — par predictions chupchaap galat. Sirf yahi
test us bug ko pakad sakta hai. M2 report me ye sabse mazboot evidence hai.
"""

from __future__ import annotations

import pandas as pd
import pytest

from src.data.preprocess import add_age_features, add_diagnosis_groups
from src.features.build_features import add_medication_features, add_prior_visit_features
from src.serving.feature_builder import build_serving_features

# Wo 8 columns jo raw table me nahi hote — yahi contract ka gap hain.
DERIVED = [
    "diag_1_group",
    "diag_2_group",
    "diag_3_group",
    "age_numeric",
    "age_group",
    "total_prior_visits",
    "num_med_changes",
    "num_meds_prescribed",
]

SAMPLE = {
    "race": "Caucasian",
    "gender": "Female",
    "age": "[70-80)",
    "time_in_hospital": 5,
    "num_lab_procedures": 41,
    "num_procedures": 0,
    "num_medications": 18,
    "number_outpatient": 1,
    "number_emergency": 2,
    "number_inpatient": 3,
    "number_diagnoses": 9,
    "diag_1": "250.83",
    "diag_2": "428",
    "diag_3": "V57",
    "metformin": "Up",
    "insulin": "Steady",
    "glipizide": "No",
    "glyburide": "Down",
    "change": "Ch",
    "diabetesMed": "Yes",
}


def _training_path(row: dict) -> dict:
    """Asli training path — multi-row frame par, natural detection ke saath.

    KYUN multi-row: find_medication_columns() ko nunique() > 1 chahiye. Do
    extra dummy rows dene se wo waise hi chalta hai jaise poore dataset par
    chalta hai. Hum sirf row 0 (asli SAMPLE) ka natija wapas lete hain.
    """
    variants = [dict(row), dict(row), dict(row)]
    variants[1].update({"metformin": "No", "insulin": "No", "glyburide": "Steady"})
    variants[2].update({"metformin": "Steady", "insulin": "Down", "glyburide": "No"})
    frame = pd.DataFrame(variants)
    frame = add_diagnosis_groups(frame)
    frame = add_age_features(frame)
    frame = add_prior_visit_features(frame)
    frame = add_medication_features(frame)
    return frame.iloc[0].to_dict()


def test_serving_matches_training_on_every_derived_column() -> None:
    """Dono raaste har derived column par bilkul same value den."""
    served = build_serving_features(SAMPLE)
    trained = _training_path(SAMPLE)
    for column in DERIVED:
        assert (
            served[column] == trained[column]
        ), f"SKEW in {column}: serving={served[column]!r} training={trained[column]!r}"


def test_no_derived_column_is_none() -> None:
    """Yahi wo bug hai jo abhi production me hai — 8 columns None ja rahe the."""
    served = build_serving_features(SAMPLE)
    for column in DERIVED:
        assert served[column] is not None, f"{column} None hai — imputer ise bhar dega"


def test_known_values_are_exactly_what_training_produced() -> None:
    """Hardcoded expectations — agar training logic badla to ye test tootega."""
    served = build_serving_features(SAMPLE)
    assert served["age_numeric"] == 75  # [70-80) ka midpoint
    assert served["age_group"] == "60+"  # bins [0,30,60,100]
    assert served["diag_1_group"] == "Diabetes"  # 250.83 -> 250 <= v < 251
    assert served["diag_2_group"] == "Circulatory"  # 428 -> 390-459
    assert served["diag_3_group"] == "Other"  # V57 -> V/E prefix
    assert served["total_prior_visits"] == 6  # 1 + 2 + 3
    assert served["num_med_changes"] == 2  # metformin Up, glyburide Down
    assert served["num_meds_prescribed"] == 3  # Up, Steady, Down (No nahi)


@pytest.mark.parametrize("missing", ["diag_1", "diag_2", "diag_3", "race"])
def test_missing_diagnosis_becomes_missing_not_other(missing: str) -> None:
    """Column gayab ho to bhi crash na ho — serving me ye hota rehta hai."""
    row = {k: v for k, v in SAMPLE.items() if k != missing}
    served = build_serving_features(row)
    if missing.startswith("diag"):
        assert served[f"{missing}_group"] == "Missing"
