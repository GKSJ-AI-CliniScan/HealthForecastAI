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

# WHAT      : anchor a relative MODEL_ARTIFACT_DIR against the repository
#             root, not the server process's working directory.
# WHY       : A17. INTERN_GUIDE.md documents starting the API with
#             `cd backend && uvicorn app.main:app --reload`, so the process's
#             cwd is backend/. The default "ml/artifacts" is written relative
#             to the repo root (mirroring ml/src/models/train.py's own
#             REPO_ROOT/resolve_path pattern) - resolved against backend/
#             instead, it points at the non-existent backend/ml/artifacts,
#             and both /risk/predict and /models/metrics 503 every time,
#             exactly as a mentor following the guide would see. Reproduced
#             and confirmed before this fix (see the P6 checkpoint).
# FOR WHOM  : _ModelCache.artifact_path(), the one place MODEL_ARTIFACT_DIR
#             is resolved to a real path; read_best_model_metrics() inherits
#             the fix through it automatically.
# BENEFIT   : the documented way to start this API actually finds the model
#             a real training run produced, regardless of which directory
#             the process happened to be launched from.
# COST      : an operator who deliberately wants MODEL_ARTIFACT_DIR resolved
#             relative to some OTHER working directory (not the repo root)
#             loses that option - an absolute path in the env var still
#             works unchanged, only a relative one is now repo-root-anchored.
# ALTERNATIVES : (1) leave MODEL_ARTIFACT_DIR's default as an absolute path
#             baked into .env.example instead of fixing resolution in code;
#             (2) resolve relative to the current file's location without an
#             is_absolute() check, so an operator's absolute override would
#             be silently prefixed and broken.
# CHOSEN BECAUSE : (1) only fixes the documented default, not any relative
#             value an operator sets afterward, and duplicates a path the
#             repo already has one source of truth for (this constant); (2)
#             would break the one escape hatch - an absolute path - that
#             should keep working unchanged.
REPO_ROOT = Path(__file__).resolve().parents[3]

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
        """Return the path the trained pipeline is expected at.

        A relative MODEL_ARTIFACT_DIR is resolved against REPO_ROOT, not the
        process's working directory (A17) - an absolute value is used as-is.
        """
        configured = Path(settings.MODEL_ARTIFACT_DIR)
        base = configured if configured.is_absolute() else REPO_ROOT / configured
        return base / MODEL_FILENAME

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


# WHAT      : unwrap the cached artefact down to the sklearn Pipeline
#             underneath, if the artefact is not a bare Pipeline itself.
# WHY       : A28 - ml/src/models/train.py now wraps the fitted pipeline in
#             a CalibratedClassifierCV (over a FrozenEstimator) to correct
#             predict_proba's scale. CalibratedClassifierCV does not expose
#             `.named_steps` itself; the two callers below need it for
#             feature-importance introspection (predict_proba, the only
#             thing predict_probability() needs, works identically on
#             either shape and needs no unwrapping).
# FOR WHOM  : loaded_pipeline() and _expected_columns(), the two places that
#             read `.named_steps`/`.transformers_` rather than just scoring.
# BENEFIT   : one place decides how to reach the underlying pipeline; an
#             artefact that is already a bare Pipeline (no calibration
#             configured, or an older artefact from before this fix) still
#             works unchanged.
# COST      : reaches into CalibratedClassifierCV's private-by-convention
#             `.calibrated_classifiers_[0].estimator` structure. FrozenEstimator
#             delegates attribute access to what it wraps (confirmed against
#             the installed scikit-learn, not assumed), so one level of
#             unwrapping is enough for the shape this project's train.py
#             actually produces - it is not a generic unwrapper for
#             arbitrarily nested estimators.
# ALTERNATIVES : (1) have train.py persist the original Pipeline and the
#             CalibratedClassifierCV as two separate artefacts; (2) store
#             the feature columns/importances at training time instead of
#             re-deriving them from the loaded object at request time.
# CHOSEN BECAUSE : (1) reintroduces the two-files-that-must-stay-in-sync
#             problem the reference comparison flagged as one of its own
#             strengths over a single self-describing artefact - one file
#             stays simpler than two; (2) would work but changes what
#             predict_probability()/loaded_pipeline() are responsible for
#             (serving vs. persisting derived metadata) for a saving that
#             only matters if introspection turns out to be a hot path,
#             which it is not (once per prediction request, at most).
def _underlying_pipeline(estimator: Any) -> Any:
    """Return the sklearn Pipeline inside estimator, unwrapping calibration if present."""
    if hasattr(estimator, "named_steps"):
        return estimator
    calibrated_classifiers = getattr(estimator, "calibrated_classifiers_", None)
    if calibrated_classifiers:
        candidate = calibrated_classifiers[0].estimator
        if hasattr(candidate, "named_steps"):
            return candidate
    return None


def loaded_pipeline() -> Any:
    """Return the cached artefact's underlying Pipeline, loading it on first use.

    Exposed so cds_service can introspect the fitted model's feature
    importances without reaching into _cache directly - same single-load
    path predict_probability uses, not a second loader. Returns the Pipeline
    itself even when the cached artefact is a calibrated wrapper around it.
    """
    pipeline, _ = _cache.load()
    return _underlying_pipeline(pipeline)


# WHAT      : return every column name the pipeline's fitted ColumnTransformer
#             was trained on, by reading it back off the transformer itself
#             rather than trusting a separately-maintained list to be complete.
# WHY       : N5 (verify and prove) wrote a test using the real trained
#             artefact - not the stubbed pipeline every other test uses -
#             and it failed: REQUEST_FEATURES only lists 7 columns, but
#             ml/src/models/train.py fits the ColumnTransformer on the full
#             51-column engineered feature set (see the P3/P4 checkpoints).
#             Calling predict_proba() with only 7 columns present raised
#             "columns are missing" for the other 44, every single time -
#             every prior test mocked predict_probability itself, so this
#             was never exercised end-to-end against the real artefact.
# FOR WHOM  : predict_probability(), to build a frame the loaded pipeline
#             can actually score instead of one shaped for a model that was
#             never trained.
# BENEFIT   : /risk/predict works against the real trained model without
#             retraining it on a smaller feature set (which would discard
#             all of P3's leakage proof and P4's tuning) and without asking
#             the API's caller to supply 51 raw fields, most of which
#             (individual drug dosages, ICD-9 codes) a request body has no
#             reasonable way to carry.
# COST      : the 44 columns the caller never supplies reach the pipeline as
#             None/NaN, so the trained SimpleImputer fills them with the
#             training set's median/most-frequent value rather than this
#             patient's real data - the probability is real, but it is
#             computed as if this patient were population-typical on
#             everything the API does not ask for. That is a materially
#             weaker prediction than one from the full feature set, not
#             just a formality.
# ALTERNATIVES : (1) retrain the model on only the 7 REQUEST_FEATURES
#             columns; (2) expand RiskPredictionRequest to accept all 51
#             raw columns the current model needs.
# CHOSEN BECAUSE : (1) is exactly the "invent a sixth model" scope creep N5
#             rules out here - this node is "verify and prove", not
#             "retrain"; C10 also applies (do not rewrite what P3/P4 already
#             built and gated). (2) would turn a clinical risk-scoring
#             endpoint into a form demanding two dozen drug dosages, which
#             no realistic caller has ready at the point of asking "what is
#             this admission's risk" - a materially worse API for a
#             materially small gain over median-imputed defaults, and it is
#             explicitly a schema/product decision I flagged rather than
#             made unilaterally (see this phase's checkpoint).
def _expected_columns(pipeline: Any) -> set[str]:
    """Return the full set of column names the pipeline's preprocessor needs."""
    inner = _underlying_pipeline(pipeline)
    columns: set[str] = set()
    if inner is None:
        return columns
    preprocess = inner.named_steps.get("preprocess")
    if preprocess is not None and hasattr(preprocess, "transformers_"):
        for _, _, selected in preprocess.transformers_:
            if isinstance(selected, list | tuple):
                columns.update(selected)
    return columns


def predict_probability(features: dict[str, Any]) -> float:
    """Return the 30-day readmission probability for one admission.

    Raises ModelUnavailableError when no artefact has been trained yet.
    """
    import pandas as pd

    pipeline, _ = _cache.load()
    all_columns = _expected_columns(pipeline) | set(REQUEST_FEATURES)
    row = {name: features.get(name) for name in all_columns}
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
