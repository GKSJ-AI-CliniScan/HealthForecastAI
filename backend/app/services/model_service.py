"""Readmission risk model used by the API.

The platform ships with a transparent baseline: a logistic score built from the
same admission features the ML pipeline (ml/src) is trained on. It always works,
needs no model file and can explain itself. If a trained scikit-learn artefact is
present in MODEL_ARTIFACT_DIR (risk_model.pkl + feature_columns.pkl, produced by
ml/src/models/save_model.py) it is used instead.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import settings

BASELINE_VERSION = "baseline-1.0"

# (weight per unit, reference value for an "average" admission)
WEIGHTS: dict[str, tuple[float, float]] = {
    "time_in_hospital": (0.10, 4.0),
    "num_medications": (0.03, 16.0),
    "num_lab_procedures": (0.004, 43.0),
    "number_diagnoses": (0.12, 7.0),
    "number_inpatient": (0.45, 0.6),
    "number_emergency": (0.30, 0.2),
}
INTERCEPT = -0.80
AGE_BUMP = {"[70-80)": 0.25, "[80-90)": 0.35, "[90-100)": 0.40}

# Held-out metrics of the Random Forest trained in ml/src/models/train_model.py
# (Diabetes 130-US Hospitals, 20,049 test patients, any-readmission label).
REFERENCE_METRICS: dict[str, float] = {
    "accuracy": 0.6341,
    "precision": 0.6120,
    "recall": 0.5734,
    "f1": 0.5921,
    "roc_auc": 0.6821,
}

FEATURE_LABELS = {
    "time_in_hospital": "Length of stay",
    "num_medications": "Number of medications",
    "num_lab_procedures": "Number of lab procedures",
    "number_diagnoses": "Number of diagnoses",
    "number_inpatient": "Prior inpatient visits",
    "number_emergency": "Prior emergency visits",
    "age_group": "Age group",
}


@dataclass(frozen=True)
class Driver:
    """One feature's push on the risk score (positive raises risk)."""

    feature: str
    label: str
    value: float
    contribution: float


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def _contributions(features: dict[str, Any]) -> dict[str, float]:
    """Return each feature's log-odds contribution relative to an average admission."""
    out: dict[str, float] = {}
    for name, (weight, reference) in WEIGHTS.items():
        out[name] = weight * (float(features.get(name, reference)) - reference)
    out["age_group"] = AGE_BUMP.get(str(features.get("age_group")), 0.0)
    return out


def baseline_probability(features: dict[str, Any]) -> float:
    """Readmission probability from the transparent baseline model."""
    z = INTERCEPT + sum(_contributions(features).values())
    return round(_sigmoid(z), 4)


@lru_cache
def _load_artifact() -> tuple[Any, list[str]] | None:
    """Load the trained scikit-learn model if the artefact files exist."""
    folder = Path(settings.MODEL_ARTIFACT_DIR)
    model_file, columns_file = folder / "risk_model.pkl", folder / "feature_columns.pkl"
    if not (model_file.is_file() and columns_file.is_file()):
        return None
    try:
        import joblib

        return joblib.load(model_file), list(joblib.load(columns_file))
    except Exception:  # a broken artefact must not take the API down
        return None


def active_model_info() -> dict[str, str]:
    """Describe the model currently serving predictions."""
    artifact = _load_artifact()
    return {
        "name": settings.ACTIVE_RISK_MODEL if artifact else "readmission_logistic_baseline",
        "version": "random-forest-artifact" if artifact else BASELINE_VERSION,
        "artifact_dir": settings.MODEL_ARTIFACT_DIR,
        "status": "loaded" if artifact else "baseline (no artefact found)",
    }


def predict_probability(features: dict[str, Any]) -> float:
    """Return the readmission probability for one admission."""
    artifact = _load_artifact()
    if artifact is None:
        return baseline_probability(features)
    model, columns = artifact
    row = [float(features.get(column, 0.0) or 0.0) for column in columns]
    age_column = f"age_{features.get('age_group')}"
    if age_column in columns:
        row[columns.index(age_column)] = 1.0
    return round(float(model.predict_proba([row])[0][1]), 4)


def explain(features: dict[str, Any], top: int = 3) -> list[Driver]:
    """Return the features that push this admission's risk up the most."""
    contributions = _contributions(features)
    drivers = [
        Driver(
            feature=name,
            label=FEATURE_LABELS[name],
            value=float(features.get(name, 0) or 0) if name != "age_group" else 0.0,
            contribution=round(value, 3),
        )
        for name, value in contributions.items()
    ]
    drivers.sort(key=lambda d: d.contribution, reverse=True)
    return [d for d in drivers[:top] if d.contribution > 0]
