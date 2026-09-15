"""Batch and single-record inference for the readmission risk model."""

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from src.evaluation.metrics import categorise_risk
from src.features.build_features import add_utilisation_features


def load_model(
    artifact_dir: str | Path,
    filename: str = "readmission_model.joblib",
) -> Any:
    """Load the trained prediction pipeline from disk.

    The saved artifact may be either:
    1. A direct sklearn pipeline.
    2. A dictionary containing the pipeline under the 'pipeline' key.
    """

    model_path = Path(artifact_dir) / filename

    if not model_path.exists():
        raise FileNotFoundError(
            f"No trained model at {model_path}. " "Run: python -m src.models.train"
        )

    artifact = joblib.load(model_path)

    # New artifact format:
    # {
    #     "pipeline": sklearn_pipeline,
    #     "model_name": "...",
    #     "metrics": {...}
    # }
    if isinstance(artifact, dict):
        pipeline = artifact.get("pipeline")

        if pipeline is None:
            raise ValueError(
                f"Model artifact at {model_path} is a dictionary, "
                "but it does not contain a 'pipeline' key."
            )

        if not hasattr(pipeline, "predict_proba"):
            raise TypeError(
                "The 'pipeline' object in the model artifact does not " "support predict_proba()."
            )

        return pipeline

    # Older artifact format: direct sklearn pipeline.
    if not hasattr(artifact, "predict_proba"):
        raise TypeError(
            f"Unsupported model artifact type: {type(artifact).__name__}. "
            "Expected an sklearn pipeline or a dictionary containing "
            "a prediction pipeline."
        )

    return artifact


def generate_clinical_insight(
    probability: float,
    risk_category: str,
    row: pd.Series,
) -> tuple[str, list[str]]:
    """Generate model risk insight and supporting observations."""

    clinical_insight = (
        f"The model estimates a {risk_category.lower()} risk " "of 30-day readmission."
    )

    supporting_factors: list[str] = []

    # Previous healthcare utilization.
    if row.get("any_prior_visit", 0) == 1:
        supporting_factors.append("Previous healthcare utilization is present")

    # Previous acute-care utilization.
    if row.get("prior_acute_visits", 0) > 0:
        supporting_factors.append("Previous acute-care visits are present")

    # Medication changes.
    if row.get("medication_change_flag", 0) == 1:
        supporting_factors.append("A medication change was recorded")

    # Diabetes medication usage.
    if row.get("diabetes_medication_flag", 0) == 1:
        supporting_factors.append("Diabetes medication usage is recorded")

    # Previous inpatient utilization.
    if row.get("number_inpatient", 0) > 0:
        supporting_factors.append("Previous inpatient utilization is present")

    # Longer hospital stay.
    if row.get("time_in_hospital", 0) >= 7:
        supporting_factors.append("The recorded hospital stay is relatively long")

    # Multiple diagnoses.
    if row.get("number_diagnoses", 0) >= 8:
        supporting_factors.append("Multiple diagnoses are recorded")

    # Neutral fallback.
    if not supporting_factors:
        supporting_factors.append(
            "No listed supporting utilization or " "medication-related observations were detected"
        )

    return clinical_insight, supporting_factors


def predict_frame(
    model: Any,
    frame: pd.DataFrame,
    high: float,
    medium: float,
) -> pd.DataFrame:
    """Score a dataframe and attach risk categories and insights."""

    if not isinstance(frame, pd.DataFrame):
        raise TypeError("frame must be a pandas DataFrame.")

    if not hasattr(model, "predict_proba"):
        raise TypeError(
            "The supplied model does not support predict_proba(). "
            "Use load_model() to load the trained pipeline correctly."
        )

    # Work on a copy so the caller's dataframe is not modified.
    frame = frame.copy()

    # Never pass target or patient identifiers into the model.
    frame = frame.drop(
        columns=[
            "readmitted",
            "target_30day",
            "patient_nbr",
            "encounter_id",
        ],
        errors="ignore",
    )

    # Apply the same feature engineering used during training.
    frame = add_utilisation_features(frame)

    # Generate probability of 30-day readmission.
    probabilities = model.predict_proba(frame)[:, 1]

    result = frame.copy()

    # Store predicted probability.
    result["readmission_probability"] = probabilities

    # Convert probability into the configured risk band.
    result["risk_category"] = [
        categorise_risk(
            float(probability),
            high=high,
            medium=medium,
        )
        for probability in probabilities
    ]

    insights: list[str] = []
    supporting_factors: list[list[str]] = []

    # Generate insight for every prediction.
    for probability, risk_category, (_, row) in zip(
        probabilities,
        result["risk_category"],
        result.iterrows(),
        strict=True,
    ):
        insight, factors = generate_clinical_insight(
            probability=float(probability),
            risk_category=risk_category,
            row=row,
        )

        insights.append(insight)
        supporting_factors.append(factors)

    result["clinical_insight"] = insights
    result["supporting_factors"] = supporting_factors

    return result