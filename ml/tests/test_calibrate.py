"""Tests for probability calibration mechanics.

Synthetic data only: these check behaviour (class order, ranking, serialisation,
no refit of the wrapped model), not calibration quality on the real export.
"""

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.models.calibrate import fit_calibrated_model, out_of_fold_calibrated
from src.models.train import train_one_target
from tests.test_train_pipeline import TEST_PROFILE, _synthetic_india_frame, _test_config


def _imbalanced(n: int, seed: int) -> tuple[pd.DataFrame, pd.Series]:
    rng = np.random.default_rng(seed)
    x = pd.DataFrame({"a": rng.normal(size=n), "b": rng.normal(size=n)})
    y = pd.Series((x["a"] + rng.normal(scale=1.5, size=n) > 2.0).astype(int))
    return x, y


@pytest.fixture(scope="module")
def weighted_model() -> tuple[Pipeline, pd.DataFrame, pd.Series]:
    """A class-weighted model (inflated probabilities) plus a separate calibration split."""
    x_train, y_train = _imbalanced(3000, seed=1)
    model = Pipeline(
        [("scale", StandardScaler()), ("model", LogisticRegression(class_weight="balanced"))]
    ).fit(x_train, y_train)
    x_cal, y_cal = _imbalanced(3000, seed=2)
    return model, x_cal, y_cal


def test_calibrated_model_serves_positive_class_probabilities(weighted_model) -> None:
    model, x_cal, y_cal = weighted_model
    calibrated = fit_calibrated_model(model, x_cal, y_cal, "sigmoid", folds=5, seed=42)
    proba = calibrated.predict_proba(x_cal)

    assert list(calibrated.classes_) == [0, 1]
    assert proba.shape == (len(x_cal), 2)
    assert np.allclose(proba.sum(axis=1), 1.0)
    # Class weighting inflates the average; calibration brings it to the observed rate.
    raw_mean = model.predict_proba(x_cal)[:, 1].mean()
    assert raw_mean > y_cal.mean() + 0.1
    assert proba[:, 1].mean() == pytest.approx(y_cal.mean(), abs=0.02)


def test_sigmoid_calibration_preserves_the_ranking(weighted_model) -> None:
    model, x_cal, y_cal = weighted_model
    calibrated = fit_calibrated_model(model, x_cal, y_cal, "sigmoid", folds=5, seed=42)
    raw = model.predict_proba(x_cal)[:, 1]
    cal = calibrated.predict_proba(x_cal)[:, 1]
    assert np.array_equal(np.argsort(raw, kind="stable"), np.argsort(cal, kind="stable"))


def test_calibration_never_refits_the_wrapped_model(weighted_model) -> None:
    model, x_cal, y_cal = weighted_model
    before = model.named_steps["model"].coef_.copy()
    fit_calibrated_model(model, x_cal, y_cal, "isotonic", folds=5, seed=42)
    assert np.array_equal(before, model.named_steps["model"].coef_)


def test_calibrated_model_round_trips_through_joblib(weighted_model, tmp_path) -> None:
    model, x_cal, y_cal = weighted_model
    calibrated = fit_calibrated_model(model, x_cal, y_cal, "sigmoid", folds=5, seed=42)
    path = tmp_path / "calibrated.joblib"
    joblib.dump(calibrated, path)
    loaded = joblib.load(path)
    assert np.array_equal(loaded.predict_proba(x_cal), calibrated.predict_proba(x_cal))


def test_out_of_fold_probabilities_cover_every_row_without_reuse(weighted_model) -> None:
    model, x_cal, y_cal = weighted_model
    oof = out_of_fold_calibrated(model, x_cal, y_cal, "sigmoid", folds=5, seed=42)
    in_sample = fit_calibrated_model(model, x_cal, y_cal, "sigmoid", 5, 42).predict_proba(x_cal)
    assert oof.shape == (len(x_cal),)
    assert ((oof > 0) & (oof < 1)).all()
    # Held-out maps differ slightly from the map fitted on every row.
    assert not np.allclose(oof, in_sample[:, 1])
    assert np.abs(oof - in_sample[:, 1]).max() < 0.05


def test_out_of_fold_calibration_is_deterministic(weighted_model) -> None:
    model, x_cal, y_cal = weighted_model
    first = out_of_fold_calibrated(model, x_cal, y_cal, "isotonic", folds=5, seed=42)
    second = out_of_fold_calibrated(model, x_cal, y_cal, "isotonic", folds=5, seed=42)
    assert np.array_equal(first, second)


@pytest.mark.parametrize("method", ["none", "beta"])
def test_unknown_or_disabled_method_is_rejected(weighted_model, method: str) -> None:
    model, x_cal, y_cal = weighted_model
    with pytest.raises(ValueError, match="calibration method"):
        fit_calibrated_model(model, x_cal, y_cal, method, folds=5, seed=42)


# -- train_one_target wiring --------------------------------------------------


def test_default_config_serves_the_uncalibrated_pipeline_at_threshold_half() -> None:
    result = train_one_target(
        _synthetic_india_frame(120), TEST_PROFILE, _test_config(), "readmission"
    )
    assert isinstance(result["pipeline"], Pipeline)
    assert result["calibration"]["method"] == "none"
    assert result["decision_threshold"]["value"] == 0.5
    assert result["decision_threshold"]["selected_on"] == "validation"
    assert {"pr_auc", "brier_score"} <= set(result["metrics"])
    assert "brier_score" in result["test_calibration"]


def test_calibrated_config_serves_a_calibrated_model_with_a_validation_threshold() -> None:
    config = _test_config()
    config["calibration"] = {"method": "sigmoid", "folds": 3}
    config["decision_threshold"] = {"strategy": "max_f1"}
    result = train_one_target(_synthetic_india_frame(240), TEST_PROFILE, config, "readmission")

    served = result["pipeline"]
    assert isinstance(served, CalibratedClassifierCV)
    assert list(served.classes_) == [0, 1]
    info = result["calibration"]
    assert info["fitted_on"] == "validation"
    assert {"validation_uncalibrated", "validation_out_of_fold"} <= set(info)
    threshold = result["decision_threshold"]
    assert threshold["strategy"] == "max_f1"
    assert 0.0 < threshold["value"] < 1.0
    assert threshold["validation"]["threshold"] == threshold["value"]
