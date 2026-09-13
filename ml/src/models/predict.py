"""Single-record and batch inference for the readmission risk model."""

from pathlib import Path
from typing import Any

import joblib
import pandas as pd


def load_model(
    artifact_dir: str | Path,
    filename: str = "readmission_model.joblib",
) -> Any:
    """Load a trained model from disk."""
    model_path = Path(artifact_dir) / filename

    if not model_path.exists():
        raise FileNotFoundError(
            f"No trained model at {model_path}. " "Run the training pipeline first."
        )

    return joblib.load(model_path)


def predict_probabilities(
    model: Any,
    frame: pd.DataFrame,
) -> pd.Series:
    """Return readmission probabilities for each input record."""
    probabilities = model.predict_proba(frame)[:, 1]

    return pd.Series(
        probabilities,
        index=frame.index,
        name="readmission_probability",
    )


def categorise_risk(
    probability: float,
    high: float = 0.70,
    medium: float = 0.40,
) -> str:
    """Map a probability onto the platform risk bands."""
    if not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be between 0.0 and 1.0")

    if probability >= high:
        return "high"

    if probability >= medium:
        return "medium"

    return "low"


def predict_frame(
    model: Any,
    frame: pd.DataFrame,
    high: float = 0.70,
    medium: float = 0.40,
) -> pd.DataFrame:
    """Score a dataframe and attach probability and risk category."""
    result = frame.copy()

    probabilities = predict_probabilities(model, frame)

    result["readmission_probability"] = probabilities

    result["risk_category"] = [
        categorise_risk(
            float(probability),
            high=high,
            medium=medium,
        )
        for probability in probabilities
    ]

    return result
