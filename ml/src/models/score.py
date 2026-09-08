"""Batch scoring: score every loaded patient and write the results to PostgreSQL.

Milestone 2. Real-time prediction serves one encounter from whatever the caller
supplies; this scores the complete record for everybody, which is what the risk
dashboards and the readmission forecast read.

Usage:
    python -m src.models.score                 # score everyone
    python -m src.models.score --limit 5000    # a quick subset
    python -m src.models.score --replace       # clear previous predictions first
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.features.build_features import add_utilisation_features
from src.utils.config import load_config, resolve_path

DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/healthforecast"


def get_engine(database_url: str | None = None) -> Engine:
    """Return a SQLAlchemy engine for the target database."""
    url = database_url or os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL
    return create_engine(url, future=True)


def load_artifact(config: dict[str, Any]) -> dict[str, Any]:
    """Load the promoted model artifact."""
    path = resolve_path(config["artifacts"]["output_dir"]) / config["artifacts"]["model_filename"]
    if not path.exists():
        raise FileNotFoundError(f"No trained model at {path}. Run: python -m src.models.train")
    artifact = joblib.load(path)
    if not isinstance(artifact, dict) or "pipeline" not in artifact:
        raise ValueError(f"Artifact at {path} is not in the expected format. Retrain.")
    return artifact


def band(probability: float, high: float, medium: float) -> str:
    """Map a probability onto the platform's risk bands."""
    if probability >= high:
        return "high"
    if probability >= medium:
        return "medium"
    return "low"


def resolve_patient_ids(engine: Engine, medical_record_numbers: pd.Series) -> pd.Series:
    """Map medical record numbers onto the patient ids already in the database."""
    with engine.connect() as connection:
        lookup = {
            mrn: pk
            for pk, mrn in connection.execute(
                text("SELECT id, medical_record_number FROM patients")
            )
        }
    return medical_record_numbers.map(lookup)


def write_predictions(
    engine: Engine, rows: list[dict[str, Any]], chunk_size: int, replace: bool
) -> int:
    """Insert prediction rows in batches."""
    if replace:
        with engine.begin() as connection:
            connection.execute(text("TRUNCATE risk_predictions RESTART IDENTITY"))

    statement = text(
        "INSERT INTO risk_predictions "
        "(patient_id, readmission_probability, risk_category, model_name, model_version) "
        "VALUES (:patient_id, :readmission_probability, :risk_category, "
        " :model_name, :model_version)"
    )

    written = 0
    with engine.begin() as connection:
        for start in range(0, len(rows), chunk_size):
            batch = rows[start : start + chunk_size]
            connection.execute(statement, batch)
            written += len(batch)
    return written


def run(
    limit: int | None = None,
    replace: bool = False,
    chunk_size: int = 2000,
    database_url: str | None = None,
    config_path: str | None = None,
) -> dict[str, Any]:
    """Score the dataset and write the predictions. Returns a report."""
    config = load_config(config_path)
    dataset = config["dataset"]
    bands = config["risk_bands"]

    artifact = load_artifact(config)
    pipeline = artifact["pipeline"]
    threshold = float(artifact.get("decision_threshold", 0.5))

    frame = basic_clean(load_raw(resolve_path(dataset["raw_path"])), config, drop_columns=False)
    frame = add_utilisation_features(frame)
    if limit:
        frame = frame.head(limit).copy()

    actual = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])

    features = frame.drop(
        columns=[
            column
            for column in (dataset["target_column"], "readmitted_within_30_days")
            if column in frame.columns
        ]
    )
    # The pipeline drops anything it was not fitted on, so passing the identifier
    # columns through is harmless. Probabilities are clipped for the same reason
    # the API clips them - see backend/app/services/model_service.py.
    probabilities = pipeline.predict_proba(features)[:, 1].clip(0.001, 0.999)

    engine = get_engine(database_url)
    medical_record_numbers = "MRN-" + frame["patient_nbr"].astype(str)
    patient_ids = resolve_patient_ids(engine, medical_record_numbers)

    known = patient_ids.notna()
    rows = [
        {
            "patient_id": int(patient_id),
            "readmission_probability": float(probability),
            "risk_category": band(float(probability), bands["high"], bands["medium"]),
            "model_name": artifact.get("model_name", "unknown"),
            "model_version": artifact.get("model_version", "0.0.0"),
        }
        for patient_id, probability in zip(
            patient_ids[known], probabilities[known.to_numpy()], strict=True
        )
    ]

    written = write_predictions(engine, rows, chunk_size, replace)

    flagged = int((probabilities >= threshold).sum())
    categories = pd.Series([row["risk_category"] for row in rows]).value_counts().to_dict()

    return {
        "model": f"{artifact.get('model_name')} v{artifact.get('model_version')}",
        "decision_threshold": threshold,
        "scored": int(len(probabilities)),
        "unmatched_patients": int((~known).sum()),
        "predictions_written": written,
        "flagged_for_review": flagged,
        "risk_distribution": {k: int(v) for k, v in categories.items()},
        "mean_probability": round(float(np.mean(probabilities)), 4),
        "expected_readmissions": round(float(np.sum(probabilities)), 1),
        "actual_readmissions": int(actual.sum()),
    }


def main() -> None:
    """Command line entrypoint."""
    parser = argparse.ArgumentParser(description="Batch score patients for readmission risk")
    parser.add_argument("--limit", type=int, default=None, help="Score only the first N rows")
    parser.add_argument("--replace", action="store_true", help="Clear existing predictions")
    parser.add_argument("--chunk-size", type=int, default=2000, help="Rows per insert batch")
    parser.add_argument("--database-url", default=None, help="Override DATABASE_URL")
    parser.add_argument("--config", default=None, help="Path to config.yaml")
    args = parser.parse_args()

    report = run(
        limit=args.limit,
        replace=args.replace,
        chunk_size=args.chunk_size,
        database_url=args.database_url,
        config_path=args.config,
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
