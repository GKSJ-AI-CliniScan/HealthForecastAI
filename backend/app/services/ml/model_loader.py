"""Loads the current-production model artefact for a model family.

The registry (model_metadata, Phase A) is the single source of truth for
"which artefact is live" - this module never hardcodes a filename or a path.
Register a newly trained artefact with scripts/register_model.py before a
prediction endpoint can serve it.

Integrity: scripts/register_model.py registers each version at its own
``runs/<target>/<version>/model.joblib``, next to the run's ``metrics.json``
whose ``artifact.sha256`` was recorded at training time. Before such a file is
first loaded its sha256 must match that record; if the record is missing,
unreadable or different, the model is refused (ModelNotAvailableError) rather
than served. The check runs before unpickling and once per process, when the
artefact is loaded into the cache.

Legacy rows - registered before versioned runs, pointing at a shared
``<target>_model.joblib`` - have no recorded hash to check against. They are
still served, for compatibility, with a warning in the log; registering the
model again with the current script moves it to a verified, versioned path.
"""

import hashlib
import json
import logging
from pathlib import Path
from typing import Any

import joblib
from sqlalchemy.orm import Session

from app.models.model_metadata import ModelMetadata
from app.repositories.model_metadata_repository import ModelMetadataRepository

logger = logging.getLogger(__name__)

# Names written by ml/src/models/artifacts.py for a versioned run.
VERSIONED_MODEL_FILE = "model.joblib"
RUN_METRICS_FILE = "metrics.json"

# Process-wide, keyed by the resolved artefact path rather than model_name so
# that two different tests (or two different registered versions within one
# process) pointing at different files never collide or serve a stale object.
_pipeline_cache: dict[str, Any] = {}


class ModelNotAvailableError(Exception):
    """Raised when no usable production model is registered for a family."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        super().__init__(f"No production model is registered for '{model_name}'.")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_artifact(record: ModelMetadata, artifact_path: Path) -> None:
    """Fail closed unless a versioned artefact matches its recorded sha256.

    Raises ModelNotAvailableError (and logs why) for a versioned artefact
    whose run metadata is missing/unreadable or whose bytes differ. Returns
    without checking for a legacy, unversioned artefact (see module docstring).
    """
    label = f"{record.model_name} v{record.version}"
    if artifact_path.name != VERSIONED_MODEL_FILE:
        logger.warning(
            "Serving %s from an unversioned artefact with no recorded sha256; "
            "register it again to enable integrity checks.",
            label,
        )
        return
    try:
        metadata = json.loads((artifact_path.parent / RUN_METRICS_FILE).read_text(encoding="utf-8"))
        expected = metadata["artifact"]["sha256"]
        if not isinstance(expected, str) or len(expected) != 64:
            raise ValueError("malformed sha256")
        actual = _sha256(artifact_path)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        logger.error(
            "Refusing to load %s: its artefact or run metadata is missing or unreadable (%s).",
            label,
            type(exc).__name__,
        )
        raise ModelNotAvailableError(record.model_name) from None
    if actual != expected.lower():
        logger.error(
            "Refusing to load %s: the artefact does not match the sha256 recorded at "
            "training time (changed or replaced after registration).",
            label,
        )
        raise ModelNotAvailableError(record.model_name)


class ModelLoader:
    """Resolves a model family to its production pipeline object."""

    def __init__(self, db: Session) -> None:
        self.repo = ModelMetadataRepository(db)

    def get_production_pipeline(self, model_name: str) -> tuple[Any, ModelMetadata]:
        """Return (fitted sklearn Pipeline, the model_metadata row it came from).

        Raises ModelNotAvailableError when no production row is registered,
        when its artefact_path no longer exists on disk, or when a versioned
        artefact fails its integrity check - each is the caller's cue to return
        a clear "not available yet" response rather than a 500, and none of
        them ever loads the file.
        """
        record = self.repo.get_production(model_name)
        if record is None:
            raise ModelNotAvailableError(model_name)

        artifact_path = Path(record.artifact_path)
        if not artifact_path.exists():
            logger.error("Refusing to load %s v%s: artefact not found.", model_name, record.version)
            raise ModelNotAvailableError(model_name)

        cache_key = str(artifact_path.resolve())
        if cache_key not in _pipeline_cache:
            verify_artifact(record, artifact_path)
            _pipeline_cache[cache_key] = joblib.load(artifact_path)
        return _pipeline_cache[cache_key], record


def clear_cache() -> None:
    """Drop every cached pipeline. Used by tests so one test's fixture model
    at a reused temp path can never be served to a later, unrelated test."""
    _pipeline_cache.clear()
