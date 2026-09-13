"""Probability calibration helpers for the readmission risk model."""

from typing import Any

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator


def calibrate_model(
    model: Any,
    x_calibration,
    y_calibration: np.ndarray,
) -> CalibratedClassifierCV:
    """Calibrate an already-fitted model using held-out data."""
    calibrator = CalibratedClassifierCV(
        FrozenEstimator(model),
        method="sigmoid",
    )

    calibrator.fit(x_calibration, y_calibration)

    return calibrator
