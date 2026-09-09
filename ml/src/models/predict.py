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
    """Load a trained pipeline from disk."""

    model_path = Path(artifact_dir) / filename

    if not model_path.exists():
        raise FileNotFoundError(
            f"No trained model at {model_path}. " "Run: python -m src.models.train"
        )

    return joblib.load(model_path)


def generate_clinical_insight(
    probability: float,
    risk_category: str,
    row: pd.Series,
) -> tuple[str, list[str]]:
    """Generate a simple model-based insight and supporting observations."""

    clinical_insight = (
        f"The model estimates a {risk_category.lower()} risk " "of 30-day readmission."
    )

    supporting_factors: list[str] = []

    # Describe previous healthcare utilization when present.
    if row.get("any_prior_visit", 0) == 1:
        supporting_factors.append("Previous healthcare utilization is present")

    # Describe previous acute-care utilization when present.
    if row.get("prior_acute_visits", 0) > 0:
        supporting_factors.append("Previous acute-care visits are present")

    # Describe medication changes when present.
    if row.get("medication_change_flag", 0) == 1:
        supporting_factors.append("A medication change was recorded")

    # Describe diabetes medication usage when present.
    if row.get("diabetes_medication_flag", 0) == 1:
        supporting_factors.append("Diabetes medication usage is recorded")

    # Provide a neutral observation when no listed factors are present.
    if not supporting_factors:
        supporting_factors.append(
            "No listed supporting utilization or medication-change " "observations were detected"
        )

    return clinical_insight, supporting_factors


def predict_frame(
    model: Any,
    frame: pd.DataFrame,
    high: float,
    medium: float,
) -> pd.DataFrame:
    """Score a dataframe and attach risk and clinical insights."""

    # Never allow the target or patient identifier into the model.
    frame = frame.drop(
        columns=["readmitted", "patient_nbr"],
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
            float(value),
            high=high,
            medium=medium,
        )
        for value in probabilities
    ]

    insights = []
    supporting_factors = []

    # Generate an insight for each predicted patient.
    for probability, risk_category, (_, row) in zip(
        probabilities,
        result["risk_category"],
        result.iterrows(),
        strict=True,
    ):
        insight, factors = generate_clinical_insight(
            float(probability),
            risk_category,
            row,
        )

        insights.append(insight)
        supporting_factors.append(factors)

    result["clinical_insight"] = insights
    result["supporting_factors"] = supporting_factors

    return result
