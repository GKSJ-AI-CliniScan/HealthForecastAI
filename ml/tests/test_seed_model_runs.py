"""Tests for the model_runs seed: document schema, single-active rule, dry-run output.

The schema/rule tests run everywhere. The dry-run tests read
ml/artifacts/model_runs_seed.json (written by
`python -m scripts.seed_model_runs --dry-run`) and are skipped if that
evidence file has not been generated on this machine.
"""

import json
from pathlib import Path

import pytest

from scripts.seed_model_runs import (
    DOCUMENTED_KEYS,
    LINEAGE_KEYS,
    REQUIRED_METRICS,
    enforce_single_active,
    mongo_settings,
    validate_run_document,
)

SEED_JSON = Path(__file__).resolve().parents[1] / "artifacts" / "model_runs_seed.json"


def make_document(**overrides: object) -> dict:
    """A minimal valid run document; tests override one field to break it."""
    document = {
        "run_id": "xgboost-0123456789ab",
        "model_name": "readmission_xgboost",
        "model_version": "xgboost-202609301703",
        "algorithm": "xgboost",
        "framework": "xgboost",
        "framework_version": "2.1.4",
        "trained_at": "2026-09-30T17:03:41+00:00",
        "git_commit": "a" * 40,
        "dataset_hash": "sha256:" + "b" * 64,
        "dataset": {
            "name": "diabetes_130_us_hospitals",
            "sha256": "b" * 64,
            "n_train": 10,
            "n_val": 2,
            "n_test": 3,
            "split_strategy": "stratified",
        },
        "n_features": 51,
        "hyperparameters": {"max_depth": 6},
        "metrics": dict.fromkeys(REQUIRED_METRICS, 0.5),
        "threshold": 0.1117,
        "threshold_selection": {"split": "validation"},
        "artifact_path": "ml/artifacts/readmission_model.joblib",
        "artifact_sha256": "c" * 64,
        "promoted": True,
        "is_active": True,
        "serving_latency_ms": {"median": 5.0},
    }
    document.update(overrides)
    return document


def test_a_complete_document_is_valid() -> None:
    assert validate_run_document(make_document()) == []


def test_missing_key_is_reported() -> None:
    document = make_document()
    del document["artifact_sha256"]
    assert any("artifact_sha256" in problem for problem in validate_run_document(document))


def test_out_of_range_metric_and_threshold_are_reported() -> None:
    bad = make_document(metrics={**make_document()["metrics"], "roc_auc": 1.7}, threshold=1.0)
    problems = validate_run_document(bad)
    assert any("metrics.roc_auc" in problem for problem in problems)
    assert any("threshold" in problem for problem in problems)


@pytest.mark.parametrize("flags", [[False, False, False], [True, True, False]])
def test_enforce_single_active_rejects_zero_or_two_active(flags: list[bool]) -> None:
    documents = [make_document(run_id=f"m{i}", is_active=flag) for i, flag in enumerate(flags)]
    with pytest.raises(ValueError):
        enforce_single_active(documents)


def test_enforce_single_active_accepts_exactly_one() -> None:
    documents = [make_document(run_id=f"m{i}", is_active=i == 1) for i in range(3)]
    enforce_single_active(documents)  # no exception


def test_mongo_settings_follow_the_backend_env_var_names(monkeypatch: pytest.MonkeyPatch) -> None:
    """Same variable names as backend Settings, so one export configures both."""
    monkeypatch.setenv("MONGO_URI", "mongodb://example:27017")
    monkeypatch.setenv("MONGO_DB", "test_db")
    assert mongo_settings() == ("mongodb://example:27017", "test_db")


# --- Dry-run evidence file --------------------------------------------------

needs_seed_json = pytest.mark.skipif(
    not SEED_JSON.exists(), reason="run `python -m scripts.seed_model_runs --dry-run` first"
)


@pytest.fixture
def seed_payload() -> dict:
    return json.loads(SEED_JSON.read_text(encoding="utf-8"))


@needs_seed_json
def test_dry_run_has_lr_rf_xgboost_with_valid_schema(seed_payload: dict) -> None:
    documents = seed_payload["documents"]
    assert {doc["algorithm"] for doc in documents} == {
        "logistic_regression",
        "random_forest",
        "xgboost",
    }
    for doc in documents:
        assert validate_run_document(doc) == [], doc["run_id"]
        # The collections.md shape and the M4 lineage fields are both present.
        assert set(DOCUMENTED_KEYS) | set(LINEAGE_KEYS) <= set(doc)


@needs_seed_json
def test_dry_run_has_exactly_one_active_run_at_the_production_threshold(seed_payload: dict) -> None:
    active = [doc for doc in seed_payload["documents"] if doc["is_active"]]
    assert len(active) == 1
    assert active[0]["artifact_path"].endswith("readmission_model.joblib")
    assert active[0]["threshold"] == pytest.approx(0.1117, abs=1e-4)
    assert active[0]["threshold_selection"]["split"] == "validation"


@needs_seed_json
def test_dry_run_reproduces_metrics_json(seed_payload: dict) -> None:
    """The seed's recomputed numbers matched train.py's metrics.json when it was written."""
    assert seed_payload["reproduces_metrics_json"] is True
    assert seed_payload["reproduction_mismatches"] == []


@needs_seed_json
def test_run_ids_are_derived_from_the_artifact_hash(seed_payload: dict) -> None:
    """run_id = algorithm + artifact sha prefix -> idempotent upserts, unique per artifact."""
    run_ids = [doc["run_id"] for doc in seed_payload["documents"]]
    assert len(run_ids) == len(set(run_ids))
    for doc in seed_payload["documents"]:
        assert doc["run_id"] == f"{doc['algorithm']}-{doc['artifact_sha256'][:12]}"
