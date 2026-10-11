"""Probability calibration for an already-trained pipeline.

Class weighting (config imbalance.strategy) makes the classifiers rank the
minority class well but inflates their stated probabilities. Calibration
fits a monotone map from the frozen model's score to an observed rate on the
VALIDATION split - never on training rows (the model has already fitted
those) and never on test rows (they must stay untouched for the final
report).

Two things are produced from the validation split:

* out-of-fold calibrated probabilities - each row is mapped by a calibrator
  fitted without that row - used to judge calibration quality and to choose
  the decision threshold without fitting and scoring on the same rows;
* the served model - one calibrator fitted on the whole validation split,
  wrapped around the unchanged pipeline, used for test and in production.
"""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.model_selection import StratifiedKFold, cross_val_predict

CALIBRATION_METHODS = ("none", "sigmoid", "isotonic")


def _calibrator(model: Any, method: str, folds: int, seed: int) -> CalibratedClassifierCV:
    # FrozenEstimator: the wrapped pipeline is never refitted. ensemble=False
    # fits one calibration map on all rows passed to fit(); the cv only
    # drives the (identical) frozen predictions it is fitted on.
    return CalibratedClassifierCV(
        FrozenEstimator(model),
        method=method,
        ensemble=False,
        cv=StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed),
    )


def _check_method(method: str) -> None:
    if method not in CALIBRATION_METHODS or method == "none":
        raise ValueError(f"Unknown calibration method '{method}'; use sigmoid or isotonic.")


def fit_calibrated_model(
    model: Any, x_cal: pd.DataFrame, y_cal: pd.Series, method: str, folds: int, seed: int
) -> CalibratedClassifierCV:
    """Return ``model`` wrapped in a calibrator fitted on (x_cal, y_cal).

    The result exposes predict_proba with classes_ [0, 1], so the backend's
    ``predict_proba(row)[:, 1]`` serves the calibrated probability unchanged.
    """
    _check_method(method)
    return _calibrator(model, method, folds, seed).fit(x_cal, y_cal)


def out_of_fold_calibrated(
    model: Any, x_cal: pd.DataFrame, y_cal: pd.Series, method: str, folds: int, seed: int
) -> np.ndarray:
    """Calibrated positive-class probabilities, each from a calibrator that never saw its row."""
    _check_method(method)
    outer = StratifiedKFold(n_splits=folds, shuffle=True, random_state=seed)
    proba = cross_val_predict(
        _calibrator(model, method, folds, seed), x_cal, y_cal, cv=outer, method="predict_proba"
    )
    return np.asarray(proba[:, 1])
