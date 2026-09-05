"""Tests for model_service's hardening (N5: "verify and prove", not rebuild).

model_service.py was already built to spec at P1 - see the P1 checkpoint.
These tests exist to prove that, not to re-implement it. One of them
(test_predict_probability_handles_a_model_trained_on_more_columns_than_the_api_sends)
found a real gap: the loaded pipeline is fit on far more columns than
REQUEST_FEATURES ever supplies, and predict_probability crashed against the
real trained artefact every time before this phase's fix to
_expected_columns()/predict_probability. See this phase's checkpoint.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
import pytest
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from app.core.config import settings
from app.services import model_service


@pytest.fixture(autouse=True)
def _reset_model_cache():
    """Every test starts and ends with a clean, unloaded cache."""
    model_service.reset_cache()
    yield
    model_service.reset_cache()


def _train_pipeline(extra_numeric_columns: tuple[str, ...] = ()) -> Pipeline:
    """A small but real, fitted pipeline - not a stub - shaped like the
    production one: trained on more columns than REQUEST_FEATURES supplies.
    """
    frame = pd.DataFrame(
        {
            "time_in_hospital": [1, 5, 3, 8, 2, 6],
            "num_medications": [2, 10, 5, 15, 3, 9],
            "age_group": ["<30", "60+", "30-60", "60+", "<30", "30-60"],
        }
    )
    for column in extra_numeric_columns:
        frame[column] = [0, 1, 0, 1, 1, 0]
    target = [0, 1, 0, 1, 0, 1]

    # Matches the shape of ml/src/features/build_features.build_preprocessor:
    # numeric columns are imputed (never passed through raw), so a column the
    # request never supplies arrives as NaN and is filled, not rejected.
    numeric = [c for c in frame.columns if c != "age_group"]
    preprocess = ColumnTransformer(
        transformers=[
            ("numeric", SimpleImputer(strategy="median"), numeric),
            (
                "categorical",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("encode", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                ["age_group"],
            ),
        ]
    )
    pipeline = Pipeline([("preprocess", preprocess), ("model", LogisticRegression())])
    pipeline.fit(frame, target)
    return pipeline


def _write_artifact(
    tmp_path: Path, monkeypatch, pipeline: Pipeline, best_model: str = "logistic_regression"
) -> None:
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    joblib.dump(pipeline, tmp_path / model_service.MODEL_FILENAME)
    (tmp_path / model_service.METRICS_FILENAME).write_text(
        json.dumps({"best_model": best_model, "results": {best_model: {}}}), encoding="utf-8"
    )


# --- missing artefact -------------------------------------------------------


def test_predict_probability_raises_a_clear_error_when_no_artefact_exists(
    tmp_path: Path, monkeypatch
) -> None:
    """A missing model is a controlled outage, not a crash or a fabricated score."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    with pytest.raises(model_service.ModelUnavailableError, match="No trained model at"):
        model_service.predict_probability({"time_in_hospital": 3})


def test_is_available_is_false_with_no_artefact_on_disk(tmp_path: Path, monkeypatch) -> None:
    """is_available() checks the filesystem directly, without loading anything."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    assert model_service.is_available() is False


# --- single-load caching -----------------------------------------------------


def test_the_artefact_is_loaded_from_disk_only_once(tmp_path: Path, monkeypatch) -> None:
    """Three calls that need the pipeline must not re-read the file three times."""
    _write_artifact(tmp_path, monkeypatch, _train_pipeline())

    real_load = joblib.load
    calls = {"count": 0}

    def counting_load(path):  # noqa: ANN001 - matches joblib.load's signature loosely
        calls["count"] += 1
        return real_load(path)

    monkeypatch.setattr(joblib, "load", counting_load)

    model_service.predict_probability(
        {"time_in_hospital": 3, "num_medications": 5, "age_group": "60+"}
    )
    model_service.model_version()
    model_service.predict_probability(
        {"time_in_hospital": 1, "num_medications": 2, "age_group": "<30"}
    )

    assert calls["count"] == 1


def test_is_available_true_does_not_by_itself_load_the_pipeline(
    tmp_path: Path, monkeypatch
) -> None:
    """is_available() must stay a cheap filesystem check, not a hidden load."""
    _write_artifact(tmp_path, monkeypatch, _train_pipeline())
    assert model_service.is_available() is True
    assert model_service._cache._pipeline is None  # nothing loaded yet


# --- model_version ------------------------------------------------------------


def test_model_version_is_never_the_placeholder_string(tmp_path: Path, monkeypatch) -> None:
    """0.0.0-placeholder must never reach a caller - it must come from the artefact."""
    _write_artifact(tmp_path, monkeypatch, _train_pipeline(), best_model="xgboost")
    version = model_service.model_version()
    assert version != "0.0.0-placeholder"
    assert version.startswith("xgboost-")


def test_model_version_falls_back_to_a_timestamp_without_metrics_json(
    tmp_path: Path, monkeypatch
) -> None:
    """No metrics.json is still not the placeholder - just the bare timestamp."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    joblib.dump(_train_pipeline(), tmp_path / model_service.MODEL_FILENAME)
    version = model_service.model_version()
    assert version != "0.0.0-placeholder"
    assert version.isdigit()  # just the YYYYMMDDHHMM stamp, no metrics to name a model


# --- the real gap this phase found and fixed ---------------------------------


def test_predict_probability_handles_a_model_trained_on_more_columns_than_the_api_sends(
    tmp_path: Path, monkeypatch
) -> None:
    """N5 found this failing against the real artefact: REQUEST_FEATURES (7
    columns) is far smaller than the ~51 columns ml/src/models/train.py
    actually fits the ColumnTransformer on. Reproduced here with a real,
    small pipeline trained on extra columns the request never supplies.
    """
    pipeline = _train_pipeline(extra_numeric_columns=("num_lab_procedures", "number_inpatient"))
    _write_artifact(tmp_path, monkeypatch, pipeline)

    probability = model_service.predict_probability(
        {"time_in_hospital": 4, "num_medications": 7, "age_group": "30-60"}
    )
    assert 0.0 <= probability <= 1.0


# --- A17: MODEL_ARTIFACT_DIR must not depend on the process's cwd -----------


def test_artifact_path_does_not_depend_on_the_process_working_directory(
    monkeypatch, tmp_path
) -> None:
    """INTERN_GUIDE.md documents starting uvicorn from backend/ - before the
    A17 fix, resolving the default "ml/artifacts" from there pointed at a
    directory that does not exist, and /risk/predict + /models/metrics both
    503'd every time. A relative MODEL_ARTIFACT_DIR must resolve to the same
    real path regardless of which directory the process happened to start in.
    """
    from_here = model_service._cache.artifact_path()
    monkeypatch.chdir(tmp_path)  # simulate a process started somewhere else entirely
    from_elsewhere = model_service._cache.artifact_path()
    assert from_here == from_elsewhere
    assert from_here.is_absolute()


def test_an_absolute_model_artifact_dir_is_still_used_as_is(tmp_path: Path, monkeypatch) -> None:
    """The REPO_ROOT anchor must not hijack an operator's absolute override."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    assert model_service._cache.artifact_path() == tmp_path / model_service.MODEL_FILENAME
