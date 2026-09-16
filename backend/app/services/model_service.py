"""model service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

Loads and caches the trained readmission-risk pipeline (and its training
metrics) from MODEL_ARTIFACT_DIR, so the API doesn't hit disk on every call.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.core.config import settings

_MODEL_FILENAME = "readmission_model.joblib"
_METRICS_FILENAME = "metrics.json"

_METRIC_KEYS = ("accuracy", "precision", "recall", "f1", "roc_auc")


class ModelNotAvailableError(RuntimeError):
    """Raised when no trained model artifact exists yet."""


def _artifact_dir() -> Path:
    return Path(settings.MODEL_ARTIFACT_DIR)


@lru_cache
def load_pipeline() -> Any:
    """Load and cache the trained sklearn pipeline from disk.

    Raises ModelNotAvailableError if `python -m src.models.train` (in ml/)
    hasn't been run yet, so no artifact exists.
    """
    model_path = _artifact_dir() / _MODEL_FILENAME
    if not model_path.exists():
        raise ModelNotAvailableError(
            f"No trained model at {model_path}. From ml/, run: "
            "python -m src.models.train --config configs/config.yaml"
        )
    return joblib.load(model_path)


@lru_cache
def load_metrics() -> dict[str, float | None]:
    """Load and cache evaluation metrics for the model training selected as best.

    Returns a dict with all-None values if no metrics.json exists yet,
    rather than raising - /ml-models/metrics should degrade gracefully.
    """
    metrics_path = _artifact_dir() / _METRICS_FILENAME
    empty: dict[str, float | None] = dict.fromkeys(_METRIC_KEYS)

    if not metrics_path.exists():
        return empty

    summary = json.loads(metrics_path.read_text(encoding="utf-8"))
    best_model = summary.get("best_model")
    results = summary.get("results", {})
    best_metrics = results.get(best_model, {})
    return {key: best_metrics.get(key) for key in _METRIC_KEYS}


def model_status() -> dict[str, Any]:
    """Return whether a model is currently loadable, for /ml-models/active."""
    try:
        load_pipeline()
    except ModelNotAvailableError:
        return {"status": "not-loaded"}
    return {"status": "loaded"}


def predict_one(features: dict[str, Any]) -> float:
    """Score a single feature row and return the raw readmission probability.

    `features` must contain exactly the columns the pipeline was fit on (see
    the milestone-2 note in ml/configs/config.yaml's drop_columns) - anything
    else raises KeyError/ValueError from inside the ColumnTransformer.
    """
    pipeline = load_pipeline()
    frame = pd.DataFrame([features])
    return float(pipeline.predict_proba(frame)[:, 1][0])


def clear_cache() -> None:
    """Drop cached model/metrics. Call this after retraining in the same process."""
    load_pipeline.cache_clear()
    load_metrics.cache_clear()
