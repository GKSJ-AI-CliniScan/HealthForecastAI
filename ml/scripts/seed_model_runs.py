"""Seed MongoDB `model_runs` with the LR, RF and XGBoost training runs.

Usage (from ml/):
    python -m scripts.seed_model_runs            # compute, write JSON, upsert into Mongo
    python -m scripts.seed_model_runs --dry-run  # compute and write JSON only, no Mongo

WHY: GET /api/v1/models (backend/app/api/v1/endpoints/ml_models.py) is a
TODO(milestone-4) that reads its registry from the `model_runs` collection.
This script fills that collection with one document per model, where every
number is *measured* - computed now from the real saved artifacts on the real
test split - never typed in by hand.

Data flow: lineage_common.rebuild_splits() (same split as train.py)
-> load_or_train_models() (production joblib + LR/RF, retrained only if
missing) -> evaluate each on the test split -> build_run_document()
-> ml/artifacts/model_runs_seed.json (always, as evidence) -> Mongo upsert
on run_id (unless --dry-run) -> backend reads it for /models and
/models/active.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import sklearn

from scripts.lineage_common import (
    PRODUCTION_ARTIFACT,
    SplitData,
    artifacts_dir,
    git_commit,
    load_or_train_models,
    read_metrics_json,
    rebuild_splits,
    repo_relative,
    sha256_file,
    validation_threshold,
)
from src.evaluation.metrics import evaluate_probabilities, meets_promotion_thresholds
from src.models.train import REPO_ROOT

# Collection name fixed by the backend TODO and by
# database/mongodb/schemas/collections.md - must match exactly or the
# endpoint reads an empty collection.
COLLECTION = "model_runs"

# Evidence file. Written on every run (dry or real) so the exact documents
# that were (or would have been) upserted can be reviewed and tested
# without a database - ml/tests/test_seed_model_runs.py reads it.
SEED_JSON_NAME = "model_runs_seed.json"

# Same defaults as backend/app/core/config.py's Settings (MONGO_URI,
# MONGO_DB). The backend is not imported - it needs pydantic-settings and a
# different working directory - so the defaults are mirrored instead.
DEFAULT_MONGO_URI = "mongodb://localhost:27017"
DEFAULT_MONGO_DB = "healthforecast"

# How many single-row predictions to time for serving_latency_ms. Enough for
# a stable median (a few hundred), small enough to finish in seconds.
LATENCY_SAMPLES = 200
LATENCY_WARMUP = 10

# Keys every document must carry. The first group is the shape already
# documented in database/mongodb/schemas/collections.md (kept with the same
# names and meaning so anything written against that doc keeps working);
# the second group is the Milestone 4 lineage fields. validate_run_document()
# checks both, and the tests run it against the dry-run JSON.
DOCUMENTED_KEYS = (
    "model_name",
    "model_version",
    "trained_at",
    "dataset_hash",
    "hyperparameters",
    "metrics",
    "promoted",
)
LINEAGE_KEYS = (
    "run_id",
    "algorithm",
    "framework",
    "framework_version",
    "git_commit",
    "dataset",
    "n_features",
    "threshold",
    "threshold_selection",
    "artifact_path",
    "artifact_sha256",
    "is_active",
    "serving_latency_ms",
)
REQUIRED_METRICS = ("accuracy", "roc_auc", "pr_auc", "recall", "precision", "f1", "brier")
REQUIRED_DATASET_KEYS = ("name", "sha256", "n_train", "n_val", "n_test", "split_strategy")

# Tolerance when comparing recomputed metrics to metrics.json. The numbers
# are the same computation on the same rows, so anything beyond float noise
# means the split or artifact is not the one train.py produced.
REPRODUCTION_TOLERANCE = 1e-9


def mongo_settings() -> tuple[str, str]:
    """Return (MONGO_URI, MONGO_DB) resolved like the backend's Settings.

    Order: real environment variable -> KEY=value line in a .env file
    (backend/.env, then repo-root .env - the backend reads .env from its
    working directory) -> the backend's default. Same variable names, so one
    exported MONGO_URI configures the API and this script alike.
    """
    file_values: dict[str, str] = {}
    for env_file in (REPO_ROOT / "backend" / ".env", REPO_ROOT / ".env"):
        if not env_file.exists():
            continue
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.partition("=")
            if sep and not line.lstrip().startswith("#"):
                file_values.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    uri = os.environ.get("MONGO_URI") or file_values.get("MONGO_URI") or DEFAULT_MONGO_URI
    db = os.environ.get("MONGO_DB") or file_values.get("MONGO_DB") or DEFAULT_MONGO_DB
    return uri, db


def underlying_estimator(model: Any) -> Any:
    """Return the bare LR/RF/XGB estimator inside the calibrated wrapper.

    Saved shape (train.calibrate_probabilities): CalibratedClassifierCV
    -> FrozenEstimator -> Pipeline[preprocess, model]. Same unwrapping idea
    as backend model_service._underlying_pipeline(). Needed to read the
    real fitted hyperparameters and the library that produced the model.
    """
    return model.estimator.estimator.named_steps["model"]


def clean_hyperparameters(estimator: Any) -> dict[str, Any]:
    """The estimator's actual get_params(), minus unset (None/NaN) entries.

    WHY get_params() and not config.yaml: it also captures what the code
    added on top of the config - class_weight="balanced", random_state=42
    and XGBoost's computed scale_pos_weight (~10.1) - so the registry shows
    what was really fitted. Values are coerced to JSON/BSON-safe types.
    """
    cleaned: dict[str, Any] = {}
    for key, value in sorted(estimator.get_params().items()):
        if value is None or (isinstance(value, float) and math.isnan(value)):
            continue
        if isinstance(value, np.generic):
            value = value.item()
        if not isinstance(value, str | int | float | bool):
            value = str(value)
        cleaned[key] = value
    return cleaned


def framework_of(estimator: Any) -> tuple[str, str]:
    """(framework, version) of the library that trained the estimator.

    Recorded because a joblib pickle is only guaranteed to load under the
    library version that wrote it - the first thing to check if the backend
    ever fails to unpickle an artifact.
    """
    if type(estimator).__module__.startswith("xgboost"):
        import xgboost

        return "xgboost", xgboost.__version__
    return "scikit-learn", sklearn.__version__


def median_latency_ms(model: Any, rows: Any) -> dict[str, Any]:
    """Measure single-row predict_proba time, the way the API serves one patient.

    WHAT: times predict_proba on one-row DataFrames taken from the test split
    (after a short warm-up so first-call setup cost is not counted) and
    returns the median plus p95. WHY median: one slow call caused by the OS
    or garbage collection should not move the headline number. Caveat for the
    report: measured on this laptop, in-process - it excludes HTTP, auth and
    DB time the real endpoint adds.
    """
    sample = rows.iloc[: LATENCY_WARMUP + LATENCY_SAMPLES]
    for index in range(LATENCY_WARMUP):
        model.predict_proba(sample.iloc[[index]])
    timings = []
    for index in range(LATENCY_WARMUP, len(sample)):
        start = time.perf_counter()
        model.predict_proba(sample.iloc[[index]])
        timings.append((time.perf_counter() - start) * 1000.0)
    timings.sort()
    return {
        "median": round(statistics.median(timings), 3),
        "p95": round(timings[int(0.95 * (len(timings) - 1))], 3),
        "n_samples": len(timings),
        "method": "in-process predict_proba on one test row, after warm-up",
    }


def build_run_document(
    name: str,
    entry: dict[str, Any],
    data: SplitData,
    dataset_sha256: str,
    commit: dict[str, Any],
    production_name: str,
) -> dict[str, Any]:
    """Score one model on the test split and build its model_runs document.

    Steps: (1) threshold re-derived on VALIDATION (as train.py does);
    (2) test-split probabilities -> evaluate_probabilities() at that
    threshold; (3) hashes, versions, hyperparameters and measured latency
    attached; (4) is_active = this is the model inside
    readmission_model.joblib, i.e. the one the backend serves.
    """
    model = entry["model"]
    artifact_path: Path = entry["path"]

    threshold, val_precision, val_recall = validation_threshold(model, data)
    y_proba_test = model.predict_proba(data.x_test)[:, 1]
    evaluation = evaluate_probabilities(data.y_test, y_proba_test, threshold)
    confusion = evaluation.pop("confusion_matrix")

    estimator = underlying_estimator(model)
    framework, framework_version = framework_of(estimator)
    artifact_sha256 = sha256_file(artifact_path)
    # Training time = the artifact file's modification time. train.py does not
    # record a timestamp itself, and the file is written at the end of the
    # training run, so its mtime is the closest real record available.
    trained_at = datetime.fromtimestamp(artifact_path.stat().st_mtime, tz=UTC)
    is_active = name == production_name
    promotion_bar = data.config["evaluation"]["thresholds"]
    metrics = {key: evaluation[key] for key in REQUIRED_METRICS}

    return {
        # run_id = algorithm + first 12 hex chars of the artifact hash. Same
        # bytes -> same id, so re-running the seed updates the document in
        # place (idempotent upsert); a retrained model -> new bytes -> new id,
        # so history is kept instead of overwritten.
        "run_id": f"{name}-{artifact_sha256[:12]}",
        # "readmission_<algo>" follows the example in collections.md and the
        # backend's ACTIVE_RISK_MODEL default ("readmission_xgboost_v1").
        "model_name": f"readmission_{name}",
        # Same formula as backend model_service._read_version() -
        # "<best_model>-<artifact mtime YYYYmmddHHMM>" - so the active run's
        # model_version equals what the API reports for the loaded model.
        "model_version": f"{name}-{trained_at.strftime('%Y%m%d%H%M')}",
        "algorithm": name,
        "framework": framework,
        "framework_version": framework_version,
        "trained_at": trained_at.isoformat(),
        "seeded_at": datetime.now(tz=UTC).isoformat(),
        "git_commit": commit["commit"],
        "git_dirty": commit["dirty"],
        "dataset_hash": f"sha256:{dataset_sha256}",
        "dataset": {
            "name": data.config["dataset"]["name"],
            "path": repo_relative(data.raw_path),
            "sha256": dataset_sha256,
            "n_raw_rows": data.n_raw_rows,
            "n_rows_after_cleaning": len(data.frame),
            "n_train": len(data.x_train),
            "n_val": len(data.x_val),
            "n_test": len(data.x_test),
            "test_prevalence": float(data.y_test.mean()),
            "split_strategy": (
                "stratified random split, 70/10/20 train/val/test, random_state="
                f"{data.config['split']['random_state']}; one encounter per patient "
                "(cleaning.first_encounter_only), so patient-disjoint by construction"
            ),
        },
        # n_features = input columns the model receives (after identifiers and
        # the target are dropped); n_model_inputs = width after one-hot.
        "n_features": len(data.feature_columns),
        "n_model_inputs": int(
            len(model.estimator.estimator.named_steps["preprocess"].get_feature_names_out())
        ),
        "hyperparameters": clean_hyperparameters(estimator),
        "calibration": "isotonic, fit on the validation split (CalibratedClassifierCV)",
        "metrics": metrics,
        "metrics_split": "test",
        "confusion_matrix": confusion,
        "threshold": threshold,
        "threshold_selection": {
            "method": "highest precision with recall >= min_recall (select_decision_threshold)",
            "split": "validation",
            "min_recall": float(promotion_bar.get("recall", 0.50)),
            "validation_precision": val_precision,
            "validation_recall": val_recall,
        },
        "artifact_path": repo_relative(artifact_path),
        "artifact_sha256": artifact_sha256,
        "retrained_for_seed": entry["retrained"],
        # promoted = clears the config's evaluation.thresholds bar (the
        # existing collections.md field). is_active = actually serving. A
        # model could be promotable but not active; only one can be active.
        "promoted": meets_promotion_thresholds(metrics, promotion_bar),
        "is_active": is_active,
        "serving_latency_ms": median_latency_ms(model, data.x_test),
    }


def enforce_single_active(documents: list[dict[str, Any]]) -> None:
    """Raise unless exactly one document has is_active=True.

    The backend's /models/active will pick "the" active run; zero or two
    would make that answer undefined, so the seed refuses to write either.
    """
    active = [doc["run_id"] for doc in documents if doc.get("is_active") is True]
    if len(active) != 1:
        raise ValueError(f"Expected exactly one active model run, found {len(active)}: {active}")


def validate_run_document(document: dict[str, Any]) -> list[str]:
    """Return a list of schema problems (empty list = valid).

    Used before writing (the seed refuses invalid documents) and by the tests
    on the dry-run JSON. Checks presence of every documented + lineage key,
    the metric and dataset sub-keys, and the value ranges that would reveal
    a bug (a probability-type metric outside [0, 1], a threshold outside it).
    """
    problems = [
        f"missing key: {key}" for key in (*DOCUMENTED_KEYS, *LINEAGE_KEYS) if key not in document
    ]
    metrics = document.get("metrics", {})
    for key in REQUIRED_METRICS:
        value = metrics.get(key)
        if not isinstance(value, int | float) or not 0.0 <= float(value) <= 1.0:
            problems.append(f"metrics.{key} must be a number in [0, 1], got {value!r}")
    dataset = document.get("dataset", {})
    problems += [f"missing dataset.{key}" for key in REQUIRED_DATASET_KEYS if key not in dataset]
    threshold = document.get("threshold")
    if not isinstance(threshold, int | float) or not 0.0 < float(threshold) < 1.0:
        problems.append(f"threshold must be in (0, 1), got {threshold!r}")
    if not isinstance(document.get("is_active"), bool):
        problems.append("is_active must be a bool")
    if len(str(document.get("artifact_sha256", ""))) != 64:
        problems.append("artifact_sha256 must be a 64-char hex digest")
    return problems


def check_reproduces_metrics_json(
    documents: list[dict[str, Any]], summary: dict[str, Any]
) -> list[str]:
    """Compare recomputed numbers with train.py's metrics.json, model by model.

    WHY: this is the proof that the seed describes the same models and the
    same test split as M2/M3 - not a look-alike. Threshold, ROC-AUC, recall
    and precision must match to float noise, and the active model's
    threshold must equal metrics.json's top-level decision_threshold (0.1117).
    Returns human-readable mismatches; empty = fully reproduced.
    """
    mismatches: list[str] = []
    for doc in documents:
        reference = summary["results"].get(doc["algorithm"])
        if reference is None:
            mismatches.append(f"{doc['algorithm']}: not in metrics.json")
            continue
        pairs = {
            "threshold": (doc["threshold"], reference["decision_threshold"]),
            "roc_auc": (doc["metrics"]["roc_auc"], reference["roc_auc"]),
            "recall": (doc["metrics"]["recall"], reference["recall"]),
            "precision": (doc["metrics"]["precision"], reference["precision"]),
        }
        for key, (ours, theirs) in pairs.items():
            if abs(float(ours) - float(theirs)) > REPRODUCTION_TOLERANCE:
                mismatches.append(f"{doc['algorithm']}.{key}: seed={ours} metrics.json={theirs}")
        if (
            doc["is_active"]
            and abs(doc["threshold"] - summary["decision_threshold"]) > REPRODUCTION_TOLERANCE
        ):
            mismatches.append("active model threshold differs from metrics.json decision_threshold")
    return mismatches


def upsert_into_mongo(documents: list[dict[str, Any]]) -> str:
    """Write the documents into Mongo `model_runs`, idempotently.

    replace_one(..., upsert=True) keyed on run_id: running the seed twice
    leaves the same documents, not duplicates. A unique index on run_id
    backs that up at the database level. After the upsert, every *other*
    document is set is_active=False, so an older run left over from a
    previous training can never stay "active" next to the new one.
    """
    from pymongo import MongoClient

    uri, db_name = mongo_settings()
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")  # fail fast with a clear error if Mongo is down
        collection = client[db_name][COLLECTION]
        collection.create_index("run_id", unique=True)
        for doc in documents:
            collection.replace_one({"run_id": doc["run_id"]}, doc, upsert=True)
        active_id = next(doc["run_id"] for doc in documents if doc["is_active"])
        collection.update_many({"run_id": {"$ne": active_id}}, {"$set": {"is_active": False}})
        total = collection.count_documents({})
        active_count = collection.count_documents({"is_active": True})
    finally:
        client.close()
    # Location printed without credentials: only the host part after any "@".
    return f"{db_name}.{COLLECTION} @ {uri.split('@')[-1]} - {total} docs, {active_count} active"


def main(argv: list[str] | None = None) -> int:
    """Compute every run document, write the evidence JSON, then upsert (unless --dry-run)."""
    parser = argparse.ArgumentParser(description="Seed MongoDB model_runs from real artifacts")
    parser.add_argument("--dry-run", action="store_true", help="write JSON only, skip Mongo")
    parser.add_argument("--config", default=None, help="path to config.yaml")
    args = parser.parse_args(argv)

    # 1) Same data + split as training, and the three models (retrained only if missing).
    data = rebuild_splits(args.config)
    models = load_or_train_models(data)
    summary = read_metrics_json(data.config)
    production_name = summary["best_model"]

    # 2) One document per model; shared lineage values computed once.
    dataset_sha256 = sha256_file(data.raw_path)
    commit = git_commit()
    documents = [
        build_run_document(name, entry, data, dataset_sha256, commit, production_name)
        for name, entry in models.items()
    ]

    # 3) Gates: valid schema, one active run, numbers reproduce metrics.json.
    enforce_single_active(documents)
    problems = {doc["run_id"]: validate_run_document(doc) for doc in documents}
    problems = {run_id: issues for run_id, issues in problems.items() if issues}
    if problems:
        raise SystemExit(f"Invalid model_runs documents: {problems}")
    mismatches = check_reproduces_metrics_json(documents, summary)

    # 4) Evidence JSON - always written, before Mongo is touched.
    out_path = artifacts_dir(data.config) / SEED_JSON_NAME
    payload = {
        "collection": COLLECTION,
        "production_artifact": PRODUCTION_ARTIFACT,
        "reproduces_metrics_json": not mismatches,
        "reproduction_mismatches": mismatches,
        "documents": documents,
    }
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(documents)} run documents to {repo_relative(out_path)}")
    for doc in documents:
        m = doc["metrics"]
        print(
            f"  {doc['run_id']:32s} active={doc['is_active']!s:5s} thr={doc['threshold']:.4f} "
            f"auc={m['roc_auc']:.4f} pr_auc={m['pr_auc']:.4f} recall={m['recall']:.4f} "
            f"precision={m['precision']:.4f} f1={m['f1']:.4f} brier={m['brier']:.4f} "
            f"latency={doc['serving_latency_ms']['median']}ms retrained={doc['retrained_for_seed']}"
        )
    if mismatches:
        print(f"WARNING - does not reproduce metrics.json: {mismatches}", file=sys.stderr)
        return 1

    # 5) Mongo, unless this is a dry run.
    if args.dry_run:
        print("--dry-run: MongoDB not contacted.")
        return 0
    print(f"Upserted into {upsert_into_mongo(documents)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
