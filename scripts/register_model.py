#!/usr/bin/env python
"""Register a trained ml/ artefact into the backend's model_metadata registry.

Run after `python -m src.models.train` (from ml/) has produced
ml/artifacts/{target}_model.joblib and ml/artifacts/{target}_metrics.json:

    cd backend && alembic upgrade head && cd ..
    python scripts/register_model.py risk
    python scripts/register_model.py readmission

This project has no separate staged-review workflow yet, so registering a
promoted version makes it production straight away and retires whatever was
production before it for that model family. The artefact and metrics files
are never committed to git - re-run this after every training run.

Safety checks, applied to every registration:

* provenance    - the metrics record their source files and training rows;
* target        - the metrics were trained for the family being registered;
* integrity     - the model file's sha256 matches the one recorded at training;
* compatibility - the model exposes predict_proba over classes [0, 1] and its
  features are ones the backend's FeatureBuilder supplies.

A run that did not meet the promotion thresholds is refused. Such a run is
never copied to the shared {target}_* files, so name it with --run, and pass
--allow-unpromoted to register it deliberately as an experimental "staged"
version: it is never made production that way, and every check above still
applies.

    python scripts/register_model.py readmission --run 20261010T123456789012Z --allow-unpromoted

Each registered version points at its own immutable file under
ml/artifacts/runs/<target>/<version>/, never at the shared
{target}_model.joblib that the next promoted training run replaces.

Artefacts saved before versioned runs existed record no sha256, so nothing in
them can prove the shared model file is the one those metrics describe. They
are adopted only with --expect-sha256, the model's hash recorded independently
(for example when the files were first backed up): the shared file must match
it before it is copied (write-once) into runs/<target>/<version>/, and the copy
must match it afterwards. The original files are left untouched.

    python scripts/register_model.py readmission --expect-sha256 <64 hex digits>
"""

import argparse
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
# Both packages are imported by path from this checkout: backend/ for the
# registry and the serving feature contract, ml/ for the artefact helpers.
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "ml"))

_TARGETS = ("risk", "readmission")
_SHA256 = re.compile(r"[0-9a-f]{64}")


class RegistrationRefused(SystemExit):
    """A safety check failed; nothing was written to the registry."""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", choices=_TARGETS, help="Which trained flow to register")
    parser.add_argument(
        "--artifacts-dir",
        default=str(REPO_ROOT / "ml" / "artifacts"),
        help="Directory containing {target}_model.joblib and {target}_metrics.json",
    )
    parser.add_argument(
        "--run",
        default=None,
        help="Register this saved run (a directory name under runs/<target>/) instead "
        "of the latest promoted one",
    )
    parser.add_argument(
        "--allow-unpromoted",
        action="store_true",
        help="Register a run that missed the promotion thresholds as an experimental "
        "'staged' version (never production). All other checks still apply.",
    )
    parser.add_argument(
        "--expect-sha256",
        default=None,
        help="Required to adopt an artefact saved before versioned runs: the model "
        "file's sha256, recorded independently. Adoption is refused without it or "
        "on any mismatch.",
    )
    return parser


def ml_modules() -> tuple[Any, list[str]]:
    """Return (src.models.artifacts, the backend FeatureBuilder's columns)."""
    from app.services.ml import feature_builder
    from src.models import artifacts

    return artifacts, list(feature_builder.FEATURE_COLUMNS)


def load_result(artifacts_dir: Path, target: str, run: str | None = None) -> dict[str, Any]:
    if run is None:
        metrics_path = artifacts_dir / f"{target}_metrics.json"
    else:
        if Path(run).name != run or run in {".", ".."} or run.endswith(".partial"):
            raise RegistrationRefused(f"'{run}' is not a saved run name.")
        metrics_path = artifacts_dir / "runs" / target / run / "metrics.json"
    if not metrics_path.exists():
        raise RegistrationRefused(
            f"Missing {metrics_path}. Run `python -m src.models.train --target {target}` "
            "from ml/ first."
        )
    result: dict[str, Any] = json.loads(metrics_path.read_text(encoding="utf-8"))
    return result


def check_provenance(result: dict[str, Any], target: str) -> None:
    dataset = result.get("dataset") or {}
    if not dataset.get("files") or not dataset.get("training_rows"):
        # Artefacts without recorded source files (e.g. an older run on
        # throwaway data) must never become the active model silently.
        raise RegistrationRefused(
            f"The {target} metrics record no training-data provenance (source files, "
            "training rows). Retrain with the current src/models/train.py before "
            "registering."
        )
    if result.get("target") != target:
        raise RegistrationRefused(
            f"The metrics describe a '{result.get('target')}' model, not '{target}'. "
            "Refusing to register one model family under another's name."
        )


def resolve_versioned_model(
    artifacts_dir: Path,
    result: dict[str, Any],
    target: str,
    expect_sha256: str | None = None,
) -> Path:
    """Return the immutable, version-specific model file for this result.

    Runs saved by the current trainer record their run directory and sha256.
    Older artefacts are copied write-once into runs/<target>/<version>/ first,
    and only against ``expect_sha256`` (see _adopt_legacy). Either way the
    file's sha256 is verified before it is returned.
    """
    artifacts, _ = ml_modules()
    recorded = result.get("artifact")
    if not recorded:
        recorded = _adopt_legacy(artifacts, artifacts_dir, result, target, expect_sha256)
    # The version and its file are bound together: a version may only point
    # at its own runs/<target>/<version_id>/ directory.
    expected_dir = f"{artifacts.RUNS_DIR}/{target}/{artifacts.version_id(result['trained_at'])}"
    if (
        recorded.get("run_dir") != expected_dir
        or recorded.get("model_file") != artifacts.MODEL_FILE
    ):
        raise RegistrationRefused(
            f"The metrics point at {recorded.get('run_dir')}/{recorded.get('model_file')}, "
            f"not this version's own {expected_dir}/{artifacts.MODEL_FILE}."
        )
    run_dir = artifacts_dir / expected_dir
    model_path = run_dir / artifacts.MODEL_FILE
    run_metrics = run_dir / artifacts.METRICS_FILE
    if not model_path.exists() or not run_metrics.exists():
        raise RegistrationRefused(f"{run_dir} is missing its model or metrics file.")
    # The run's own metrics are the record of what was trained. A shared or
    # copied metrics file that disagrees with them (for example an edited
    # "promoted" flag) is refused rather than trusted.
    if json.loads(run_metrics.read_text(encoding="utf-8")) != {**result, "artifact": recorded}:
        raise RegistrationRefused(
            f"The metrics being registered do not match {run_metrics}; refusing to trust them."
        )
    if artifacts.sha256_file(model_path) != recorded["sha256"]:
        raise RegistrationRefused(
            f"{model_path} does not match the sha256 recorded at training time; "
            "the file was changed or replaced. Refusing to register it."
        )
    return model_path


def _expected_digest(expect_sha256: str | None) -> str:
    if expect_sha256 is None:
        raise RegistrationRefused(
            "These artefacts predate versioned runs and record no sha256, so the shared "
            "model cannot be proven to match its metrics. Pass --expect-sha256 with the "
            "model's independently recorded hash to adopt it."
        )
    digest = expect_sha256.strip().lower()
    if not _SHA256.fullmatch(digest):
        raise RegistrationRefused("--expect-sha256 must be a full 64-character hex sha256.")
    return digest


def _adopt_legacy(
    artifacts: Any,
    artifacts_dir: Path,
    result: dict[str, Any],
    target: str,
    expect_sha256: str | None,
) -> dict[str, Any]:
    """Copy a pre-versioning shared model into runs/<target>/<version>/ once.

    Trust comes only from ``expect_sha256``, never from the source file: the
    shared model must match it before copying and the copy must match it after.
    """
    digest = _expected_digest(expect_sha256)
    shared = artifacts_dir / f"{target}_model.joblib"
    if not shared.exists():
        raise RegistrationRefused(f"Missing {shared}.")
    if artifacts.sha256_file(shared) != digest:
        raise RegistrationRefused(
            f"{shared.name} does not match --expect-sha256; refusing to adopt it."
        )
    run_dir = artifacts.run_directory(artifacts_dir, target, result["trained_at"])
    if run_dir.exists():
        # Adopted by an earlier registration: reuse it only if it is the same model.
        existing = json.loads((run_dir / artifacts.METRICS_FILE).read_text(encoding="utf-8"))
        if existing["artifact"]["sha256"] != digest:
            raise RegistrationRefused(
                f"{run_dir} already holds a different model for version "
                f"{result['trained_at']}. Refusing to overwrite it."
            )
        recorded: dict[str, Any] = existing["artifact"]
        return recorded
    recorded = {
        "run_dir": run_dir.relative_to(artifacts_dir).as_posix(),
        "model_file": artifacts.MODEL_FILE,
        "sha256": digest,
        "adopted_from": shared.name,
    }
    partial = run_dir.with_name(run_dir.name + ".partial")
    partial.parent.mkdir(parents=True, exist_ok=True)
    partial.mkdir()
    try:
        shutil.copyfile(shared, partial / artifacts.MODEL_FILE)
        if artifacts.sha256_file(partial / artifacts.MODEL_FILE) != digest:
            raise RegistrationRefused(f"The copy of {shared.name} does not match; not adopted.")
        (partial / artifacts.METRICS_FILE).write_text(
            json.dumps({**result, "artifact": recorded}, indent=2), encoding="utf-8"
        )
        artifacts.flush_to_disk(partial / artifacts.MODEL_FILE)
        artifacts.flush_to_disk(partial / artifacts.METRICS_FILE)
        artifacts.fsync_dir(partial)
        partial.rename(run_dir)
    except BaseException:
        shutil.rmtree(partial, ignore_errors=True)
        raise
    artifacts.fsync_dir(run_dir.parent)
    return recorded


def check_compatibility(model_path: Path, result: dict[str, Any]) -> None:
    import joblib

    _, serving_columns = ml_modules()
    model = joblib.load(model_path)
    if not hasattr(model, "predict_proba"):
        raise RegistrationRefused(f"{model_path} has no predict_proba; the backend cannot use it.")
    classes = [int(c) for c in getattr(model, "classes_", [])]
    if classes != [0, 1]:
        raise RegistrationRefused(
            f"{model_path} classes are {classes}, expected [0, 1]: the backend reads "
            "predict_proba(...)[:, 1] as the positive class."
        )
    features = list((result.get("dataset") or {}).get("feature_columns") or [])
    unknown = sorted(set(features) - set(serving_columns))
    if not features or unknown:
        raise RegistrationRefused(
            f"Model features {features} are not all supplied by the backend "
            f"FeatureBuilder ({serving_columns}); unknown: {unknown}."
        )
    fitted = getattr(model, "feature_names_in_", None)
    if fitted is not None and list(fitted) != features:
        raise RegistrationRefused(
            f"{model_path} was fitted on {list(fitted)} but its metrics record {features}."
        )


def verify(
    artifacts_dir: Path,
    target: str,
    allow_unpromoted: bool = False,
    run: str | None = None,
    expect_sha256: str | None = None,
) -> tuple[dict[str, Any], Path, str]:
    """Run every check; return (result, versioned model path, registry status).

    Nothing is written to the registry here. The only possible file write is
    the write-once versioned copy of a legacy artefact.
    """
    result = load_result(artifacts_dir, target, run)
    check_provenance(result, target)
    if run is not None and run != ml_modules()[0].version_id(result["trained_at"]):
        raise RegistrationRefused(
            f"Run directory '{run}' does not belong to version {result['trained_at']}."
        )
    promoted = bool(result.get("promoted", False))
    if not promoted and not allow_unpromoted:
        raise RegistrationRefused(
            f"The {target} run did not meet the promotion thresholds in "
            "ml/configs/config.yaml. Refusing to register it. Pass --allow-unpromoted "
            "(with --run <name>) to register it as an experimental 'staged' version."
        )
    model_path = resolve_versioned_model(artifacts_dir, result, target, expect_sha256)
    check_compatibility(model_path, result)
    return result, model_path, "production" if promoted else "staged"


def register(
    session: Any, target: str, result: dict[str, Any], model_path: Path, status: str
) -> Any:
    """Write the registry row. A production row retires the previous production version."""
    from app.models.model_metadata import ModelMetadata
    from app.repositories.model_metadata_repository import ModelMetadataRepository

    existing = (
        session.query(ModelMetadata)
        .filter_by(model_name=target, version=result["trained_at"])
        .first()
    )
    if existing is not None:
        raise RegistrationRefused(
            f"{target} v{result['trained_at']} is already registered "
            f"(status {existing.status}); a version is registered once."
        )
    metrics = result["metrics"]
    trained_at = datetime.fromisoformat(result["trained_at"])
    repo = ModelMetadataRepository(session)
    record = repo.create(
        model_name=target,
        version=result["trained_at"],
        algorithm=result["algorithm"],
        accuracy=metrics.get("accuracy"),
        precision_score=metrics.get("precision"),
        recall=metrics.get("recall"),
        f1_score=metrics.get("f1"),
        roc_auc=metrics.get("roc_auc"),
        artifact_path=str(model_path.resolve()),
        status=status,
        trained_at=trained_at,
        promoted_at=trained_at if status == "production" else None,
    )
    if status == "production":
        repo.demote_other_versions(target, keep_id=record.id)
    session.commit()
    return record


def main() -> int:
    args = build_parser().parse_args()
    artifacts_dir = Path(args.artifacts_dir)
    result, model_path, status = verify(
        artifacts_dir, args.target, args.allow_unpromoted, args.run, args.expect_sha256
    )

    # Backend package only importable after REPO_ROOT/backend is on sys.path
    # (set at module load above), so this stays function-local rather than
    # top-of-file - that's the real fix for the E402 ruff was flagging, not
    # a noqa. Imported after verify() so a refused registration never needs
    # a database connection.
    from app.db.session import SessionLocal

    session = SessionLocal()
    try:
        register(session, args.target, result, model_path, status)
    finally:
        session.close()

    dataset = result["dataset"]
    files = ", ".join(f"{v['file']} ({v['rows']} rows)" for v in dataset["files"].values())
    print(
        f"Registered {args.target} v{result['trained_at']} ({result['algorithm']}) as {status}.\n"
        f"  artifact={model_path}\n  metrics={result['metrics']}\n"
        f"  dataset={dataset.get('profile')} files=[{files}] "
        f"training_rows={dataset['training_rows']}"
    )
    if status == "staged":
        print(
            "NOTE: this run did not meet the promotion thresholds. It is registered as "
            "'staged' (experimental) and will not be served by the API."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
