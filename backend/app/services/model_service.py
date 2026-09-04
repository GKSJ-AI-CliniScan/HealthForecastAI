"""Loading and serving the trained readmission model.

The artefact is loaded once and cached, not read per request: unpickling a
scikit-learn pipeline on every call would dominate the response time.

A missing artefact is reported as an error rather than silently substituted with
a zero probability. A clinician reading "0% risk" cannot tell the difference
between a healthy patient and a model that was never trained.
"""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

from app.core.config import settings

MODEL_FILENAME = "readmission_model.joblib"
METRICS_FILENAME = "metrics.json"

# Feature columns the API sends to the pipeline, in a fixed order. The trained
# ColumnTransformer selects what it needs by name and ignores the rest, so this
# list only has to be a superset of what the model was fitted on.
REQUEST_FEATURES = (
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "number_inpatient",
    "number_emergency",
    "age_group",
)


class ModelUnavailableError(Exception):
    """Raised when no trained artefact is available to score with."""


class _ModelCache:
    """Holds the loaded pipeline and its version, guarded for thread safety."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._pipeline: Any | None = None
        self._version: str | None = None

    def artifact_path(self) -> Path:
        """Return the path the trained pipeline is expected at."""
        return Path(settings.MODEL_ARTIFACT_DIR) / MODEL_FILENAME

    def load(self) -> tuple[Any, str]:
        """Return the cached pipeline and version, loading it on first use."""
        if self._pipeline is not None and self._version is not None:
            return self._pipeline, self._version

        with self._lock:
            # Re-check inside the lock: another thread may have loaded it while
            # this one was waiting.
            if self._pipeline is not None and self._version is not None:
                return self._pipeline, self._version

            path = self.artifact_path()
            if not path.exists():
                raise ModelUnavailableError(
                    f"No trained model at {path}. Run: cd ml && python -m src.models.train"
                )

            import joblib

            try:
                pipeline = joblib.load(path)
            except Exception as exc:  # noqa: BLE001 - surfaced as 503 by the caller
                raise ModelUnavailableError(f"Could not load the model at {path}: {exc}") from exc

            self._pipeline = pipeline
            self._version = _read_version(path)
            return self._pipeline, self._version

    def reset(self) -> None:
        """Drop the cached pipeline. Used by tests and after a retrain."""
        with self._lock:
            self._pipeline = None
            self._version = None


_cache = _ModelCache()


def _read_version(path: Path) -> str:
    """Derive a version string for the artefact currently on disk.

    The training run writes metrics.json next to the model; its best_model name
    plus the artefact's modification time identifies exactly which run produced
    the predictions being served.
    """
    import json
    from datetime import UTC, datetime

    stamp = datetime.fromtimestamp(path.stat().st_mtime, tz=UTC).strftime("%Y%m%d%H%M")
    metrics_path = path.parent / METRICS_FILENAME
    if metrics_path.exists():
        try:
            summary = json.loads(metrics_path.read_text(encoding="utf-8"))
            best = summary.get("best_model")
            if best:
                return f"{best}-{stamp}"
        except (OSError, json.JSONDecodeError):
            pass
    return stamp


def reset_cache() -> None:
    """Forget the loaded artefact so the next call reloads from disk."""
    _cache.reset()


def is_available() -> bool:
    """Return True when a trained artefact exists on disk."""
    return _cache.artifact_path().exists()


def model_version() -> str:
    """Return the version of the artefact currently loaded."""
    _, version = _cache.load()
    return version


def predict_probability(features: dict[str, Any]) -> float:
    """Return the 30-day readmission probability for one admission.

    Raises ModelUnavailableError when no artefact has been trained yet.
    """
    import pandas as pd

    pipeline, _ = _cache.load()
    row = {name: features.get(name) for name in REQUEST_FEATURES}
    frame = pd.DataFrame([row])

    try:
        probability = float(pipeline.predict_proba(frame)[:, 1][0])
    except Exception as exc:  # noqa: BLE001 - a stale artefact is an outage, not a 500
        raise ModelUnavailableError(
            "The loaded model could not score this request; it may have been trained "
            f"on a different feature set: {exc}"
        ) from exc

    # Clamp defensively: a corrupt artefact must not produce a probability the
    # response schema would reject with a 500.
    return min(max(probability, 0.0), 1.0)


# WHAT      : read the five headline metrics (accuracy, precision, recall,
#             F1, ROC-AUC) for whichever model ml/artifacts/metrics.json
#             names as best_model, and raise rather than return a partial
#             or empty answer when that is not possible.
# WHY       : N4b. /models/metrics previously returned an all-None dict
#             unconditionally - the exact anti-pattern C3 bans, indistinguishable
#             from "the model exists and genuinely has no accuracy" versus
#             "no model has ever been trained". A system administrator
#             reading this endpoint needs to know which situation they are
#             in.
# FOR WHOM  : GET /api/v1/models/metrics (app.api.v1.endpoints.ml_models),
#             the only caller.
# BENEFIT   : real numbers when a model has been trained and promoted-or-not
#             is recorded; a loud 503 - not a 200 with nulls - when it has not.
# COST      : this function trusts metrics.json's shape (written by
#             ml/src/models/train.py, using the same field names as
#             ml/src/evaluation/metrics.py's classification_metrics()) -
#             if that shape ever changes without updating both readers,
#             this raises ModelUnavailableError rather than silently
#             returning wrong numbers, which is the safer failure but means
#             a schema drift surfaces as an outage, not a type error at the
#             call site.
# ALTERNATIVES : (1) return whatever partial dict is available, filling
#             missing fields with None, matching the old stub's shape; (2)
#             read metrics for every model in the file and let the caller
#             pick, rather than resolving best_model here.
# CHOSEN BECAUSE : (1) is exactly the C3 anti-pattern this function exists
#             to remove - a 200 with some or all fields null cannot be told
#             apart from "no model trained yet" without reading the detail
#             text, which is what forced this rewrite in the first place;
#             (2) would move a decision (which model is "the" active one)
#             out of the one file, metrics.json, that already records it
#             via best_model, duplicating logic model_service.py's own
#             _read_version() already relies on for the same field.
def read_best_model_metrics() -> dict[str, float]:
    """Return accuracy/precision/recall/f1/roc_auc for the best trained model.

    Raises ModelUnavailableError when metrics.json is missing, unreadable,
    or missing an expected field - never a partial or all-None dict.
    """
    import json

    path = _cache.artifact_path().parent / METRICS_FILENAME
    if not path.exists():
        raise ModelUnavailableError(
            f"No metrics recorded at {path}. Run: cd ml && python -m src.models.train"
        )

    try:
        summary = json.loads(path.read_text(encoding="utf-8"))
        best_name = summary["best_model"]
        results = summary["results"][best_name]
        return {
            "accuracy": float(results["accuracy"]),
            "precision": float(results["precision"]),
            "recall": float(results["recall"]),
            "f1": float(results["f1"]),
            "roc_auc": float(results["roc_auc"]),
        }
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise ModelUnavailableError(f"Could not read metrics at {path}: {exc}") from exc
