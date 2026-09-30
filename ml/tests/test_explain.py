"""Tests for the per-patient explanation.

The claim made in src/models/explain.py is that for a logistic regression the
attribution is exact, not approximate. These tests are what turns that from an
assertion into something checked: a wrong sign, a missed calibration scale or a
mishandled one-hot group would break the identity and fail here.
"""

import numpy as np
import pandas as pd
import pytest
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from src.features.build_features import build_preprocessor
from src.models import explain


def make_frame(rows: int = 1500, seed: int = 7) -> tuple[pd.DataFrame, pd.Series]:
    """A synthetic encounter table with a known signal in three features."""
    rng = np.random.default_rng(seed)
    frame = pd.DataFrame(
        {
            "prior_inpatient": rng.poisson(0.6, rows),
            "time_in_hospital": rng.integers(1, 14, rows),
            "discharge": rng.choice(["home", "snf", "rehab"], rows, p=[0.7, 0.2, 0.1]),
            "race": rng.choice(["a", "b", "c"], rows),
        }
    )
    logit = (
        -2.4
        + 0.6 * frame["prior_inpatient"]
        + 0.05 * frame["time_in_hospital"]
        + frame["discharge"].map({"home": 0.0, "snf": 0.7, "rehab": 0.9})
    )
    target = pd.Series((rng.random(rows) < 1 / (1 + np.exp(-logit))).astype(int))
    return frame, target


def fit(method: str = "sigmoid", estimator=None, exclude=("race",)):
    """Fit a calibrated pipeline and return everything the tests need."""
    frame, target = make_frame()
    train, validation = frame.iloc[:900], frame.iloc[900:]
    y_train, y_validation = target.iloc[:900], target.iloc[900:]

    preprocessor = build_preprocessor(train, {}, exclude=list(exclude))
    pipeline = Pipeline(
        [
            ("preprocess", preprocessor),
            (
                "model",
                (
                    estimator
                    if estimator is not None
                    else LogisticRegression(class_weight="balanced", max_iter=500)
                ),
            ),
        ]
    ).fit(train, y_train)

    calibrated = CalibratedClassifierCV(FrozenEstimator(pipeline), method=method)
    calibrated.fit(validation, y_validation)
    return calibrated, preprocessor, train, validation


def test_baseline_plus_contributions_reproduces_the_calibrated_probability() -> None:
    """The identity the module rests on, to numerical precision."""
    calibrated, preprocessor, train, validation = fit("sigmoid")
    spec = explain.build_spec(calibrated, train)
    assert spec is not None and spec["exact_on_probability"] is True

    baseline_logit, grouped, _ = explain.contribution_matrix(spec, preprocessor, validation)
    reconstructed = 1 / (1 + np.exp(-(baseline_logit + grouped.sum(axis=1))))
    actual = calibrated.predict_proba(validation)[:, 1]

    np.testing.assert_allclose(reconstructed, actual, atol=1e-9)


def test_one_hot_columns_fold_back_into_the_original_feature() -> None:
    """ "discharge_snf" is an encoding detail; the finding is "discharge"."""
    calibrated, _, train, _ = fit("sigmoid")
    spec = explain.build_spec(calibrated, train)

    assert "discharge" in spec["groups"]
    assert not any(group.startswith("discharge_") for group in spec["groups"])
    assert len(set(spec["groups"])) < len(spec["feature_names"])


def test_an_excluded_feature_never_appears_in_an_explanation() -> None:
    """If race is not an input it cannot be a reason."""
    calibrated, preprocessor, train, validation = fit("sigmoid", exclude=("race",))
    spec = explain.build_spec(calibrated, train)

    assert "race" not in spec["groups"]
    explained = explain.explain_frame(spec, preprocessor, validation.head(50))
    names = {item["feature"] for row in explained for item in row["up"] + row["down"]}
    assert "race" not in names


def test_the_known_risk_factors_are_what_the_explanation_finds() -> None:
    """A patient with prior admissions and an SNF discharge is explained by those."""
    calibrated, preprocessor, train, _ = fit("sigmoid")
    spec = explain.build_spec(calibrated, train)

    patient = pd.DataFrame(
        {
            "prior_inpatient": [5],
            "time_in_hospital": [12],
            "discharge": ["snf"],
            "race": ["a"],
        }
    )
    (row,) = explain.explain_frame(spec, preprocessor, patient)
    up = {item["feature"]: item for item in row["up"]}

    assert "prior_inpatient" in up and "discharge" in up
    assert up["prior_inpatient"]["odds_ratio"] > 1.5
    assert up["discharge"]["value"] == "snf"


def test_a_low_risk_patient_is_explained_by_protective_factors() -> None:
    """The down list exists: what is keeping this patient's risk low."""
    calibrated, preprocessor, train, _ = fit("sigmoid")
    spec = explain.build_spec(calibrated, train)

    patient = pd.DataFrame(
        {"prior_inpatient": [0], "time_in_hospital": [1], "discharge": ["home"], "race": ["b"]}
    )
    (row,) = explain.explain_frame(spec, preprocessor, patient)

    assert row["down"], "a low-risk patient should have protective factors listed"
    assert all(item["odds_ratio"] < 1 for item in row["down"])
    assert all(item["odds_ratio"] > 1 for item in row["up"])


def test_a_missing_value_is_reported_as_none_not_a_crash() -> None:
    """Real-time requests omit fields; the explanation must survive that."""
    calibrated, preprocessor, train, _ = fit("sigmoid")
    spec = explain.build_spec(calibrated, train)

    patient = pd.DataFrame(
        {"prior_inpatient": [2], "time_in_hospital": [None], "discharge": [None], "race": [None]}
    )
    (row,) = explain.explain_frame(spec, preprocessor, patient)

    assert isinstance(row["up"], list) and isinstance(row["down"], list)


def test_isotonic_calibration_is_flagged_as_not_exact() -> None:
    """Isotonic has no affine link to the base log-odds - say so, don't pretend."""
    calibrated, _, train, _ = fit("isotonic")
    spec = explain.build_spec(calibrated, train)

    assert spec is not None
    assert spec["exact_on_probability"] is False


def test_a_tree_model_returns_no_spec_rather_than_approximate_numbers() -> None:
    """Approximate attribution under the same name would be worse than none."""
    calibrated, _, train, _ = fit(
        "sigmoid", estimator=RandomForestClassifier(n_estimators=20, random_state=0)
    )
    assert explain.build_spec(calibrated, train) is None


@pytest.mark.parametrize("top", [1, 3, 5])
def test_the_number_of_listed_drivers_respects_top(top: int) -> None:
    """Callers decide how long the list is."""
    calibrated, preprocessor, train, validation = fit("sigmoid")
    spec = explain.build_spec(calibrated, train)

    for row in explain.explain_frame(spec, preprocessor, validation.head(20), top=top):
        assert len(row["up"]) <= top and len(row["down"]) <= top
