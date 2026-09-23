#!/usr/bin/env python
"""Register a trained ml/ artefact into the backend's model_metadata registry.

Run after `python -m src.models.train` (from ml/) has produced
ml/artifacts/{target}_model.joblib and ml/artifacts/{target}_metrics.json:

    cd backend && alembic upgrade head && cd ..
    python scripts/register_model.py risk
    python scripts/register_model.py readmission

This project has no separate staged-review workflow yet, so registering a
version promotes it straight to production and retires whatever was
production before it for that model family. The artefact and metrics files
are never committed to git - re-run this after every training run.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.session import SessionLocal  # noqa: E402
from app.repositories.model_metadata_repository import (
    ModelMetadataRepository,
)  # noqa: E402

_TARGETS = ("risk", "readmission")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "target", choices=_TARGETS, help="Which trained flow to register"
    )
    parser.add_argument(
        "--artifacts-dir",
        default=str(REPO_ROOT / "ml" / "artifacts"),
        help="Directory containing {target}_model.joblib and {target}_metrics.json",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    artifacts_dir = Path(args.artifacts_dir)
    metrics_path = artifacts_dir / f"{args.target}_metrics.json"
    model_path = artifacts_dir / f"{args.target}_model.joblib"

    if not metrics_path.exists() or not model_path.exists():
        raise SystemExit(
            f"Missing {metrics_path} or {model_path}. Run "
            f"`python -m src.models.train --target {args.target}` from ml/ first."
        )

    result = json.loads(metrics_path.read_text(encoding="utf-8"))
    metrics = result["metrics"]
    trained_at = datetime.fromisoformat(result["trained_at"])
    version = result["trained_at"]

    session = SessionLocal()
    try:
        repo = ModelMetadataRepository(session)
        record = repo.create(
            model_name=args.target,
            version=version,
            algorithm=result["algorithm"],
            accuracy=metrics.get("accuracy"),
            precision_score=metrics.get("precision"),
            recall=metrics.get("recall"),
            f1_score=metrics.get("f1"),
            roc_auc=metrics.get("roc_auc"),
            artifact_path=str(model_path),
            status="production",
            trained_at=trained_at,
            promoted_at=trained_at,
        )
        repo.demote_other_versions(args.target, keep_id=record.id)
        session.commit()
    finally:
        session.close()

    print(
        f"Registered {args.target} v{version} ({result['algorithm']}) as production. "
        f"metrics={metrics}"
    )
    if not result.get("promoted", True):
        print(
            "WARNING: this training run did not meet the promotion thresholds in "
            "ml/configs/config.yaml - registered anyway because you asked to, but "
            "do not treat it as production-ready."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
