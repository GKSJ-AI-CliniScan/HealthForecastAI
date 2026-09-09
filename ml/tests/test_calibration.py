"""Tests for probability calibration."""

import numpy as np
from sklearn.linear_model import LogisticRegression

from src.evaluation.calibration import calibrate_model


def test_calibrate_model_returns_probability_estimator() -> None:
    """A fitted model can be calibrated using held-out data."""
    x_train = np.array(
        [
            [0.0],
            [1.0],
            [2.0],
            [3.0],
            [4.0],
            [5.0],
        ]
    )
    y_train = np.array([0, 0, 0, 1, 1, 1])

    model = LogisticRegression()
    model.fit(x_train, y_train)

    x_calibration = np.array(
        [
            [0.5],
            [0.8],
            [1.0],
            [1.3],
            [1.6],
            [1.9],
            [2.2],
            [2.5],
            [2.8],
            [3.1],
            [3.4],
            [3.7],
            [4.0],
            [4.3],
            [4.6],
            [4.9],
        ]
    )

    y_calibration = np.array(
        [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
        ]
    )

    calibrated = calibrate_model(
        model,
        x_calibration,
        y_calibration,
    )

    probabilities = calibrated.predict_proba(x_calibration)[:, 1]

    assert len(probabilities) == len(y_calibration)
    assert np.all(probabilities >= 0.0)
    assert np.all(probabilities <= 1.0)
