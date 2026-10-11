"""Tests for scripts/register_model.py, against the in-memory test database.

Covers the three registration guarantees: unpromoted runs are refused unless
explicitly allowed (and then only as "staged"), every version points at its
own immutable file, and provenance / integrity / compatibility checks cannot
be skipped by the override.
"""

import importlib.util
import json
from pathlib import Path

import joblib
import pytest
from sqlalchemy.orm import Session

from app.models.model_metadata import ModelMetadata
from tests.test_ml_services import _tiny_pipeline

_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "register_model.py"
_spec = importlib.util.spec_from_file_location("register_model", _SCRIPT)
register_model = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(register_model)

# The script puts ml/ and backend/ on sys.path from its own location, so its
# accessor is the supported way to reach src.models.artifacts - this module
# does not depend on conftest having imported anything first.
artifacts, FEATURE_COLUMNS = register_model.ml_modules()
promote_to_current = artifacts.promote_to_current
sha256_file = artifacts.sha256_file
write_run = artifacts.write_run

FIRST = "2026-10-10T10:00:00.000001+00:00"
SECOND = "2026-10-11T10:00:00.000002+00:00"


def _result(target: str = "readmission", promoted: bool = True, trained_at: str = FIRST) -> dict:
    return {
        "target": target,
        "trained_at": trained_at,
        "promoted": promoted,
        "algorithm": "logistic_regression",
        "metrics": {"accuracy": 0.7, "precision": 0.3, "recall": 0.6, "f1": 0.4, "roc_auc": 0.7},
        "dataset": {
            "profile": "india_hospital_readmission",
            "files": {"admissions": {"file": "admissions.csv", "rows": 10, "sha256": "x"}},
            "training_rows": 6,
            "feature_columns": list(FEATURE_COLUMNS),
        },
    }


def _train(artifacts_dir: Path, promoted: bool = True, trained_at: str = FIRST, **overrides):
    """Save a run the way src/models/train.py main() does."""
    result = {**_result(promoted=promoted, trained_at=trained_at), **overrides}
    run_dir, _ = write_run(artifacts_dir, result["target"], _tiny_pipeline(), result)
    if promoted:
        promote_to_current(
            artifacts_dir,
            run_dir,
            f"{result['target']}_model.joblib",
            f"{result['target']}_metrics.json",
        )
    return run_dir


def _rows(db_session: Session) -> list[ModelMetadata]:
    return db_session.query(ModelMetadata).order_by(ModelMetadata.id).all()


# -- promotion gate ---------------------------------------------------------


def test_a_promoted_run_registers_as_production_at_its_versioned_path(
    db_session: Session, tmp_path: Path
) -> None:
    run_dir = _train(tmp_path)
    result, model_path, status = register_model.verify(tmp_path, "readmission")
    record = register_model.register(db_session, "readmission", result, model_path, status)

    assert status == "production"
    assert Path(record.artifact_path) == (run_dir / "model.joblib").resolve()
    assert record.version == FIRST
    assert record.promoted_at is not None


def test_an_unpromoted_run_is_refused_by_default(db_session: Session, tmp_path: Path) -> None:
    run_dir = _train(tmp_path, promoted=False)
    with pytest.raises(register_model.RegistrationRefused, match="promotion thresholds"):
        register_model.verify(tmp_path, "readmission", run=run_dir.name)
    assert _rows(db_session) == []


def test_allow_unpromoted_registers_as_staged_and_keeps_production(
    db_session: Session, tmp_path: Path
) -> None:
    _train(tmp_path)  # production v1
    result, path, status = register_model.verify(tmp_path, "readmission")
    register_model.register(db_session, "readmission", result, path, status)
    failed = _train(tmp_path, promoted=False, trained_at=SECOND)

    result, path, status = register_model.verify(
        tmp_path, "readmission", allow_unpromoted=True, run=failed.name
    )
    staged = register_model.register(db_session, "readmission", result, path, status)

    assert status == "staged" and staged.status == "staged" and staged.promoted_at is None
    statuses = {row.version: row.status for row in _rows(db_session)}
    assert statuses == {FIRST: "production", SECOND: "staged"}


def test_the_override_does_not_skip_provenance(db_session: Session, tmp_path: Path) -> None:
    run_dir = _train(tmp_path, promoted=False, dataset={"feature_columns": list(FEATURE_COLUMNS)})
    with pytest.raises(register_model.RegistrationRefused, match="provenance"):
        register_model.verify(tmp_path, "readmission", allow_unpromoted=True, run=run_dir.name)


def test_the_override_does_not_skip_the_integrity_check(tmp_path: Path) -> None:
    run_dir = _train(tmp_path, promoted=False)
    joblib.dump(_tiny_pipeline().set_params(model__C=0.01), run_dir / "model.joblib")
    with pytest.raises(register_model.RegistrationRefused, match="sha256"):
        register_model.verify(tmp_path, "readmission", allow_unpromoted=True, run=run_dir.name)


def test_the_override_does_not_skip_the_compatibility_check(tmp_path: Path) -> None:
    run_dir = _train(
        tmp_path,
        promoted=False,
        dataset={**_result()["dataset"], "feature_columns": ["age", "lab_hba1c"]},
    )
    with pytest.raises(register_model.RegistrationRefused, match="lab_hba1c"):
        register_model.verify(tmp_path, "readmission", allow_unpromoted=True, run=run_dir.name)


# -- integrity / target / run selection --------------------------------------


def test_a_replaced_model_file_is_refused(tmp_path: Path) -> None:
    run_dir = _train(tmp_path)
    (run_dir / "model.joblib").write_bytes(b"tampered")
    with pytest.raises(register_model.RegistrationRefused, match="sha256"):
        register_model.verify(tmp_path, "readmission")


def test_a_model_is_never_registered_under_the_other_family(tmp_path: Path) -> None:
    _train(tmp_path)
    (tmp_path / "risk_metrics.json").write_bytes(
        (tmp_path / "readmission_metrics.json").read_bytes()
    )
    with pytest.raises(register_model.RegistrationRefused, match="'readmission' model, not 'risk'"):
        register_model.verify(tmp_path, "risk")


@pytest.mark.parametrize("name", ["../readmission", "..", ".", "x.partial"])
def test_run_names_cannot_escape_the_runs_directory(tmp_path: Path, name: str) -> None:
    with pytest.raises(register_model.RegistrationRefused, match="not a saved run"):
        register_model.verify(tmp_path, "readmission", run=name)


def test_missing_metrics_are_reported_clearly(tmp_path: Path) -> None:
    with pytest.raises(register_model.RegistrationRefused, match="Run `python -m src.models.train"):
        register_model.verify(tmp_path, "readmission")


# -- version-specific, immutable paths ----------------------------------------


def test_each_version_keeps_its_own_file_after_a_newer_promotion(
    db_session: Session, tmp_path: Path
) -> None:
    _train(tmp_path)
    result, path, status = register_model.verify(tmp_path, "readmission")
    first = register_model.register(db_session, "readmission", result, path, status)
    first_digest = sha256_file(Path(first.artifact_path))

    _train(tmp_path, trained_at=SECOND)
    result, path, status = register_model.verify(tmp_path, "readmission")
    second = register_model.register(db_session, "readmission", result, path, status)

    assert first.artifact_path != second.artifact_path
    assert sha256_file(Path(first.artifact_path)) == first_digest  # v1 file untouched
    db_session.refresh(first)
    assert (first.status, second.status) == ("retired", "production")


def _legacy_pair(artifacts_dir: Path) -> str:
    """Write a pre-versioning shared pair; return the model's recorded sha256.

    In real use this hash comes from an independent record (the baseline taken
    when the files were backed up), not from re-hashing the file at adoption.
    """
    joblib.dump(_tiny_pipeline(), artifacts_dir / "readmission_model.joblib")
    (artifacts_dir / "readmission_metrics.json").write_text(json.dumps(_result()), encoding="utf-8")
    return sha256_file(artifacts_dir / "readmission_model.joblib")


def test_legacy_artefacts_are_adopted_into_a_versioned_copy_without_changing_them(
    db_session: Session, tmp_path: Path
) -> None:
    """Artefacts saved before versioned runs (today's production pair) still
    register, via a verified write-once copy; the originals keep their bytes."""
    baseline = _legacy_pair(tmp_path)
    before = {p.name: p.read_bytes() for p in tmp_path.iterdir()}

    result, path, status = register_model.verify(tmp_path, "readmission", expect_sha256=baseline)
    record = register_model.register(db_session, "readmission", result, path, status)

    assert {p.name: p.read_bytes() for p in tmp_path.iterdir() if p.is_file()} == before
    assert Path(record.artifact_path).parent.parent == (tmp_path / "runs" / "readmission").resolve()
    assert sha256_file(path) == baseline
    adopted = json.loads((path.parent / "metrics.json").read_text(encoding="utf-8"))
    assert adopted["artifact"]["adopted_from"] == "readmission_model.joblib"
    assert adopted["artifact"]["sha256"] == baseline

    # Re-verifying reuses the same copy rather than writing another.
    _, again, _ = register_model.verify(tmp_path, "readmission", expect_sha256=baseline.upper())
    assert again == path


def test_legacy_adoption_requires_an_expected_hash(tmp_path: Path) -> None:
    _legacy_pair(tmp_path)
    with pytest.raises(register_model.RegistrationRefused, match="--expect-sha256"):
        register_model.verify(tmp_path, "readmission")
    assert not (tmp_path / "runs").exists()


@pytest.mark.parametrize("bad", ["", "abc123", "g" * 64, "0" * 63])
def test_legacy_adoption_rejects_a_malformed_hash(tmp_path: Path, bad: str) -> None:
    _legacy_pair(tmp_path)
    with pytest.raises(register_model.RegistrationRefused, match="64-character"):
        register_model.verify(tmp_path, "readmission", expect_sha256=bad)
    assert not (tmp_path / "runs").exists()


def test_legacy_adoption_refuses_a_model_that_does_not_match_the_baseline(
    tmp_path: Path,
) -> None:
    baseline = _legacy_pair(tmp_path)
    joblib.dump(_tiny_pipeline().set_params(model__C=0.01), tmp_path / "readmission_model.joblib")
    before = {p.name: p.read_bytes() for p in tmp_path.iterdir()}
    with pytest.raises(register_model.RegistrationRefused, match="does not match --expect-sha256"):
        register_model.verify(tmp_path, "readmission", expect_sha256=baseline)
    assert {p.name: p.read_bytes() for p in tmp_path.iterdir()} == before
    assert not (tmp_path / "runs").exists()


def test_legacy_adoption_refuses_a_copy_that_does_not_match(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    baseline = _legacy_pair(tmp_path)

    def corrupting_copy(source, destination):
        Path(destination).write_bytes(b"corrupted in transit")

    monkeypatch.setattr(register_model.shutil, "copyfile", corrupting_copy)
    with pytest.raises(register_model.RegistrationRefused, match="copy"):
        register_model.verify(tmp_path, "readmission", expect_sha256=baseline)
    assert list((tmp_path / "runs" / "readmission").iterdir()) == []


def test_a_legacy_version_collision_with_a_different_model_is_refused(tmp_path: Path) -> None:
    baseline = _legacy_pair(tmp_path)
    register_model.verify(tmp_path, "readmission", expect_sha256=baseline)
    joblib.dump(_tiny_pipeline().set_params(model__C=0.01), tmp_path / "readmission_model.joblib")
    replaced = sha256_file(tmp_path / "readmission_model.joblib")
    with pytest.raises(register_model.RegistrationRefused, match="different model"):
        register_model.verify(tmp_path, "readmission", expect_sha256=replaced)


def test_the_model_loader_serves_the_registered_versioned_file(
    db_session: Session, tmp_path: Path
) -> None:
    from app.services.ml.model_loader import ModelLoader, clear_cache

    clear_cache()
    _train(tmp_path)
    result, path, status = register_model.verify(tmp_path, "readmission")
    register_model.register(db_session, "readmission", result, path, status)

    pipeline, record = ModelLoader(db_session).get_production_pipeline("readmission")
    assert Path(record.artifact_path) == path.resolve()
    assert hasattr(pipeline, "predict_proba")
    clear_cache()


# -- review regressions -------------------------------------------------------


def test_shared_metrics_cannot_point_a_version_at_another_runs_file(tmp_path: Path) -> None:
    first = _train(tmp_path)
    _train(tmp_path, trained_at=SECOND)
    shared = tmp_path / "readmission_metrics.json"
    metrics = json.loads(shared.read_text(encoding="utf-8"))
    metrics["artifact"] = json.loads((first / "metrics.json").read_text())["artifact"]
    shared.write_text(json.dumps(metrics), encoding="utf-8")
    with pytest.raises(register_model.RegistrationRefused, match="not this version's own"):
        register_model.verify(tmp_path, "readmission")


def test_an_edited_promoted_flag_is_caught_against_the_runs_own_metrics(
    tmp_path: Path,
) -> None:
    """A failed run never reaches the shared files; hand-copying its metrics
    there with promoted flipped to true must not make it production."""
    failed = _train(tmp_path, promoted=False)
    forged = json.loads((failed / "metrics.json").read_text(encoding="utf-8"))
    forged["promoted"] = True
    (tmp_path / "readmission_metrics.json").write_text(json.dumps(forged), encoding="utf-8")
    with pytest.raises(register_model.RegistrationRefused, match="do not match"):
        register_model.verify(tmp_path, "readmission")


def test_a_copied_run_directory_cannot_be_registered_under_its_new_name(tmp_path: Path) -> None:
    import shutil

    run_dir = _train(tmp_path, promoted=False)
    shutil.copytree(run_dir, run_dir.with_name("20991231T000000000000Z"))
    with pytest.raises(register_model.RegistrationRefused, match="does not belong"):
        register_model.verify(
            tmp_path, "readmission", allow_unpromoted=True, run="20991231T000000000000Z"
        )


def test_a_version_is_registered_only_once(db_session: Session, tmp_path: Path) -> None:
    _train(tmp_path)
    result, path, status = register_model.verify(tmp_path, "readmission")
    register_model.register(db_session, "readmission", result, path, status)
    with pytest.raises(register_model.RegistrationRefused, match="already registered"):
        register_model.register(db_session, "readmission", result, path, status)
    assert len(_rows(db_session)) == 1


# -- the command line itself ----------------------------------------------------


@pytest.fixture
def cli_session(engine, monkeypatch: pytest.MonkeyPatch):
    """Point main()'s SessionLocal at this test's in-memory database."""
    from sqlalchemy.orm import sessionmaker

    import app.db.session

    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
    monkeypatch.setattr(app.db.session, "SessionLocal", factory)
    return factory


def _cli(monkeypatch: pytest.MonkeyPatch, *args: str) -> int:
    monkeypatch.setattr("sys.argv", ["register_model.py", *args])
    return register_model.main()


def test_cli_refuses_an_unpromoted_run_and_registers_it_staged_only_when_asked(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, cli_session
) -> None:
    run_dir = _train(tmp_path, promoted=False)
    base = ["readmission", "--artifacts-dir", str(tmp_path), "--run", run_dir.name]
    with pytest.raises(register_model.RegistrationRefused, match="promotion thresholds"):
        _cli(monkeypatch, *base)

    assert _cli(monkeypatch, *base, "--allow-unpromoted") == 0
    session = cli_session()
    rows = session.query(ModelMetadata).all()
    assert [(r.status, Path(r.artifact_path)) for r in rows] == [
        ("staged", (run_dir / "model.joblib").resolve())
    ]
    session.close()


def test_the_script_runs_standalone_without_the_test_suites_import_setup(
    tmp_path: Path,
) -> None:
    """Regression: the script must find ml/src on its own. A fresh interpreter
    (no conftest, no prior app import) must reach its own refusal message,
    not an ImportError - and a refusal must not need a database."""
    import subprocess
    import sys

    completed = subprocess.run(
        [sys.executable, str(_SCRIPT), "readmission", "--artifacts-dir", str(tmp_path)],
        capture_output=True,
        text=True,
        cwd=tmp_path,
        timeout=120,
    )
    assert completed.returncode == 1
    assert "Missing" in completed.stderr and "readmission_metrics.json" in completed.stderr
    assert "Error" not in completed.stderr.split("Missing")[0]


# -- production loader integrity ------------------------------------------------


@pytest.fixture(autouse=True)
def _loader_logger_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    """test_database_schema runs Alembic in-process, and its env.py fileConfig()
    disables every logger that already exists - including the model loader's.
    The server never runs Alembic in-process; re-enable it so the log
    assertions below see what production would log."""
    import logging

    monkeypatch.setattr(logging.getLogger("app.services.ml.model_loader"), "disabled", False)


@pytest.fixture
def forbid_unpickling(monkeypatch: pytest.MonkeyPatch):
    """Call after setup: from then on, any unpickling fails the test."""
    from app.services.ml import model_loader

    model_loader.clear_cache()

    def forbid() -> None:
        monkeypatch.setattr(
            model_loader.joblib, "load", lambda *a, **k: pytest.fail("must not load the file")
        )

    yield forbid
    model_loader.clear_cache()


def _register_production(db_session: Session, tmp_path: Path) -> Path:
    _train(tmp_path)
    result, path, status = register_model.verify(tmp_path, "readmission")
    register_model.register(db_session, "readmission", result, path, status)
    return path


def _loader(db_session: Session):
    from app.services.ml.model_loader import ModelLoader

    return ModelLoader(db_session)


def test_loader_refuses_a_versioned_model_replaced_after_registration(
    db_session: Session, tmp_path: Path, forbid_unpickling, caplog: pytest.LogCaptureFixture
) -> None:
    from app.services.ml.model_loader import ModelNotAvailableError

    path = _register_production(db_session, tmp_path)
    joblib.dump(_tiny_pipeline().set_params(model__C=0.01), path)
    forbid_unpickling()
    with pytest.raises(ModelNotAvailableError):
        _loader(db_session).get_production_pipeline("readmission")
    assert "does not match the sha256" in caplog.text


@pytest.mark.parametrize(
    "damage",
    [
        lambda m: m.unlink(),
        lambda m: m.write_text("{not json", encoding="utf-8"),
        lambda m: m.write_text(json.dumps({"artifact": {}}), encoding="utf-8"),
        lambda m: m.write_text(json.dumps({"artifact": {"sha256": "short"}}), encoding="utf-8"),
    ],
    ids=["missing", "unreadable", "no-sha256", "malformed-sha256"],
)
def test_loader_refuses_a_versioned_model_without_usable_run_metadata(
    db_session: Session, tmp_path: Path, forbid_unpickling, caplog: pytest.LogCaptureFixture, damage
) -> None:
    from app.services.ml.model_loader import ModelNotAvailableError

    path = _register_production(db_session, tmp_path)
    damage(path.parent / "metrics.json")
    forbid_unpickling()
    with pytest.raises(ModelNotAvailableError):
        _loader(db_session).get_production_pipeline("readmission")
    assert "missing or unreadable" in caplog.text


def test_loader_refuses_a_missing_versioned_model(
    db_session: Session, tmp_path: Path, forbid_unpickling
) -> None:
    from app.services.ml.model_loader import ModelNotAvailableError

    path = _register_production(db_session, tmp_path)
    path.unlink()
    forbid_unpickling()
    with pytest.raises(ModelNotAvailableError):
        _loader(db_session).get_production_pipeline("readmission")


def test_loader_serves_a_legacy_row_with_a_warning(
    db_session: Session, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    """A row registered before versioned runs points at a shared file with no
    recorded hash: served for compatibility, and the log says so."""
    from datetime import UTC, datetime

    from app.services.ml.model_loader import clear_cache

    clear_cache()
    shared = tmp_path / "readmission_model.joblib"
    joblib.dump(_tiny_pipeline(), shared)
    db_session.add(
        ModelMetadata(
            model_name="readmission",
            version="legacy",
            algorithm="logistic_regression",
            artifact_path=str(shared),
            status="production",
            trained_at=datetime.now(UTC),
        )
    )
    db_session.commit()

    pipeline, record = _loader(db_session).get_production_pipeline("readmission")
    assert record.version == "legacy" and hasattr(pipeline, "predict_proba")
    assert "no recorded sha256" in caplog.text
    clear_cache()
