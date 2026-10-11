"""Tests for write-once versioned artefacts and the training save path.

The guarantee under test: a failed, unpromoted or interrupted training run
never replaces the shared <target>_model.joblib / <target>_metrics.json.
"""

import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pytest
from sklearn.linear_model import LogisticRegression

from src.models import artifacts, train
from src.models.artifacts import (
    METRICS_FILE,
    MODEL_FILE,
    promote_to_current,
    sha256_file,
    version_id,
    write_run,
)

TRAINED_AT = "2026-10-10T12:34:56.789012+00:00"


def _model() -> LogisticRegression:
    x = np.array([[0.0], [1.0], [2.0], [3.0]])
    return LogisticRegression().fit(x, [0, 0, 1, 1])


def _result(promoted: bool = True, trained_at: str = TRAINED_AT) -> dict:
    return {"target": "readmission", "trained_at": trained_at, "promoted": promoted}


def _seed_production(output_dir: Path) -> dict[str, bytes]:
    """Existing 'production' files whose bytes must survive untouched."""
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "readmission_model.joblib").write_bytes(b"previous-production-model")
    (output_dir / "readmission_metrics.json").write_bytes(b'{"previous": true}')
    return {p.name: p.read_bytes() for p in output_dir.iterdir() if p.is_file()}


def _current_bytes(output_dir: Path) -> dict[str, bytes]:
    return {p.name: p.read_bytes() for p in output_dir.iterdir() if p.is_file()}


# -- write_run ---------------------------------------------------------------


def test_version_id_is_filesystem_safe_and_unique_to_the_microsecond() -> None:
    assert version_id(TRAINED_AT) == "20261010T123456789012Z"
    assert version_id("2026-10-10T12:34:56.789013+00:00") != version_id(TRAINED_AT)


def test_write_run_saves_model_and_metrics_with_a_matching_sha256(tmp_path: Path) -> None:
    run_dir, recorded = write_run(tmp_path, "readmission", _model(), _result())

    assert run_dir == tmp_path / "runs" / "readmission" / "20261010T123456789012Z"
    assert {p.name for p in run_dir.iterdir()} == {MODEL_FILE, METRICS_FILE}
    on_disk = json.loads((run_dir / METRICS_FILE).read_text(encoding="utf-8"))
    assert on_disk == recorded
    assert recorded["artifact"]["run_dir"] == "runs/readmission/20261010T123456789012Z"
    assert recorded["artifact"]["sha256"] == sha256_file(run_dir / MODEL_FILE)
    assert hasattr(joblib.load(run_dir / MODEL_FILE), "predict_proba")


def test_write_run_never_overwrites_an_existing_run(tmp_path: Path) -> None:
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())
    before = sha256_file(run_dir / MODEL_FILE)
    with pytest.raises(FileExistsError):
        write_run(tmp_path, "readmission", _model(), _result())
    assert sha256_file(run_dir / MODEL_FILE) == before


def test_an_interrupted_save_leaves_no_run_and_no_partial_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken_dump(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(artifacts.joblib, "dump", broken_dump)
    with pytest.raises(OSError, match="disk full"):
        write_run(tmp_path, "readmission", _model(), _result())
    assert list((tmp_path / "runs" / "readmission").iterdir()) == []


# -- promote_to_current --------------------------------------------------------


def test_promotion_replaces_the_shared_files_with_the_run(tmp_path: Path) -> None:
    _seed_production(tmp_path)
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())
    promote_to_current(tmp_path, run_dir, "readmission_model.joblib", "readmission_metrics.json")

    current = _current_bytes(tmp_path)
    assert current["readmission_model.joblib"] == (run_dir / MODEL_FILE).read_bytes()
    assert current["readmission_metrics.json"] == (run_dir / METRICS_FILE).read_bytes()
    assert not [name for name in current if name.endswith(".incoming")]


def test_an_interrupted_promotion_keeps_the_previous_model_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the model swap fails, the old model stays and the metrics (swapped
    first) name the complete run directory - registration reads that, so the
    pair can never be mismatched."""
    before = _seed_production(tmp_path)
    run_dir, recorded = write_run(tmp_path, "readmission", _model(), _result())
    real_replace = os.replace

    def failing_replace(src, dst):
        if Path(dst).name == "readmission_model.joblib":
            raise OSError("interrupted")
        return real_replace(src, dst)

    monkeypatch.setattr(artifacts.os, "replace", failing_replace)
    with pytest.raises(OSError, match="interrupted"):
        promote_to_current(
            tmp_path, run_dir, "readmission_model.joblib", "readmission_metrics.json"
        )

    current = _current_bytes(tmp_path)
    assert current["readmission_model.joblib"] == before["readmission_model.joblib"]
    metrics = json.loads(current["readmission_metrics.json"])
    assert metrics["artifact"] == recorded["artifact"]
    assert not [name for name in current if name.endswith(".incoming")]


# -- train.main end to end (data loading and fitting stubbed) ------------------


@pytest.fixture
def stub_training(monkeypatch: pytest.MonkeyPatch):
    """Run train.main() without the dataset: the outcome is set per test."""
    outcome: dict = {}
    config = {
        "dataset": {
            "active": "stub",
            "profiles": {"stub": {"format": "relational", "raw_dir": "unused", "tables": {}}},
        },
        "artifacts": {
            "output_dir": "unused",
            "model_filename": "{target}_model.joblib",
            "metrics_filename": "{target}_metrics.json",
        },
        "evaluation": {"thresholds": {"roc_auc": 0.65}},
    }
    monkeypatch.setattr(train, "load_config", lambda path=None: config)
    monkeypatch.setattr(
        train,
        "load_relational_export",
        lambda *a, **k: (None, {"files": {"admissions": {"sha256": "x"}}}),
    )

    def fake_train(frame, profile, config, target_name, provenance, profile_name):
        if outcome.get("raise"):
            raise RuntimeError("training crashed")
        return {
            **_result(promoted=outcome["promoted"]),
            "target": target_name,
            "best_model": "logistic_regression",
            "metrics": {},
            "pipeline": _model(),
        }

    monkeypatch.setattr(train, "train_one_target", fake_train)
    return outcome


def _run_main(monkeypatch: pytest.MonkeyPatch, output_dir: Path) -> None:
    argv = ["train", "--target", "readmission", "--output-dir", str(output_dir)]
    monkeypatch.setattr(sys, "argv", argv)
    train.main()


def test_main_leaves_production_untouched_when_promotion_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, stub_training: dict
) -> None:
    before = _seed_production(tmp_path)
    stub_training["promoted"] = False
    with pytest.raises(SystemExit, match="failed the promotion thresholds"):
        _run_main(monkeypatch, tmp_path)

    assert _current_bytes(tmp_path) == before
    runs = list((tmp_path / "runs" / "readmission").iterdir())
    assert len(runs) == 1 and json.loads((runs[0] / METRICS_FILE).read_text())["promoted"] is False


def test_main_leaves_production_untouched_when_training_crashes(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, stub_training: dict
) -> None:
    before = _seed_production(tmp_path)
    stub_training["raise"] = True
    with pytest.raises(RuntimeError, match="training crashed"):
        _run_main(monkeypatch, tmp_path)

    assert _current_bytes(tmp_path) == before
    assert not (tmp_path / "runs").exists()


def test_main_promotes_a_passing_run_and_keeps_earlier_runs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, stub_training: dict
) -> None:
    _seed_production(tmp_path)
    stub_training["promoted"] = True
    _run_main(monkeypatch, tmp_path)

    run_dir = tmp_path / "runs" / "readmission" / version_id(TRAINED_AT)
    current = _current_bytes(tmp_path)
    assert current["readmission_model.joblib"] == (run_dir / MODEL_FILE).read_bytes()
    assert json.loads(current["readmission_metrics.json"])["artifact"]["run_dir"] == (
        f"runs/readmission/{version_id(TRAINED_AT)}"
    )


# -- fsync_dir -------------------------------------------------------------------


def test_fsync_dir_reports_unsupported_platforms_without_touching_the_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(artifacts, "DIR_FSYNC_SUPPORTED", False)
    monkeypatch.setattr(artifacts.os, "open", lambda *a, **k: pytest.fail("must not open"))
    assert artifacts.fsync_dir(tmp_path) is False


class _FakeDirFsync:
    """Stands in for os.open/os.fsync/os.close on a POSIX-like platform."""

    def __init__(self, error: OSError | None = None) -> None:
        self.error, self.flushed, self.closed = error, [], []

    def open(self, path, flags):
        self.flushed.append(Path(path))
        return 99

    def fsync(self, fd):
        if self.error is not None:
            raise self.error

    def close(self, fd):
        self.closed.append(fd)


@pytest.fixture
def posix_dir_fsync(monkeypatch: pytest.MonkeyPatch):
    def install(error: OSError | None = None) -> _FakeDirFsync:
        fake = _FakeDirFsync(error)
        monkeypatch.setattr(artifacts, "DIR_FSYNC_SUPPORTED", True)
        monkeypatch.setattr(artifacts.os, "open", fake.open)
        monkeypatch.setattr(artifacts.os, "fsync", fake.fsync)
        monkeypatch.setattr(artifacts.os, "close", fake.close)
        return fake

    return install


def test_fsync_dir_flushes_and_closes_the_directory(tmp_path: Path, posix_dir_fsync) -> None:
    fake = posix_dir_fsync()
    assert artifacts.fsync_dir(tmp_path) is True
    assert fake.flushed == [tmp_path] and fake.closed == [99]


def test_fsync_dir_treats_an_unsupporting_filesystem_as_not_flushed(
    tmp_path: Path, posix_dir_fsync
) -> None:
    import errno

    fake = posix_dir_fsync(OSError(errno.EINVAL, "not supported"))
    assert artifacts.fsync_dir(tmp_path) is False
    assert fake.closed == [99]


def test_fsync_dir_raises_a_real_flush_failure(tmp_path: Path, posix_dir_fsync) -> None:
    import errno

    fake = posix_dir_fsync(OSError(errno.EIO, "I/O error"))
    with pytest.raises(OSError, match="I/O error"):
        artifacts.fsync_dir(tmp_path)
    assert fake.closed == [99]


def test_write_run_flushes_the_run_and_its_parent_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[Path] = []
    monkeypatch.setattr(artifacts, "fsync_dir", lambda path: calls.append(Path(path)) or True)
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())
    assert calls == [run_dir.with_name(run_dir.name + ".partial"), run_dir.parent]


def test_a_failed_parent_flush_keeps_the_complete_run_but_reports_the_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def flaky(path):
        if Path(path).name == "readmission":
            raise OSError("EIO")
        return True

    monkeypatch.setattr(artifacts, "fsync_dir", flaky)
    with pytest.raises(OSError, match="EIO"):
        write_run(tmp_path, "readmission", _model(), _result())
    run_dir = tmp_path / "runs" / "readmission" / version_id(TRAINED_AT)
    assert {p.name for p in run_dir.iterdir()} == {MODEL_FILE, METRICS_FILE}


def test_promotion_flushes_the_directory_after_each_swap(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_production(tmp_path)
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())
    seen: list[set[str]] = []

    def record(path):
        seen.append({p.name for p in Path(path).iterdir() if p.is_file()})
        return True

    monkeypatch.setattr(artifacts, "fsync_dir", record)
    promote_to_current(tmp_path, run_dir, "readmission_model.joblib", "readmission_metrics.json")
    assert len(seen) == 2  # once after the metrics swap, once after the model swap


# -- promotion lock ----------------------------------------------------------


def test_promotion_releases_its_lock(tmp_path: Path) -> None:
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())
    promote_to_current(tmp_path, run_dir, "readmission_model.joblib", "readmission_metrics.json")
    assert not (tmp_path / artifacts.LOCK_FILE).exists()


def test_a_held_lock_blocks_promotion_and_is_left_alone(tmp_path: Path) -> None:
    before = _seed_production(tmp_path)
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())
    lock = tmp_path / artifacts.LOCK_FILE
    lock.write_text('{"pid": 4242, "host": "other"}', encoding="utf-8")

    with pytest.raises(artifacts.PromotionLockedError, match="4242"):
        promote_to_current(
            tmp_path, run_dir, "readmission_model.joblib", "readmission_metrics.json"
        )

    assert lock.read_text(encoding="utf-8") == '{"pid": 4242, "host": "other"}'
    assert _current_bytes(tmp_path) == {**before, artifacts.LOCK_FILE: lock.read_bytes()}


def test_nested_promotions_contend_for_the_same_lock(tmp_path: Path) -> None:
    with artifacts.promotion_lock(tmp_path):
        holder = json.loads((tmp_path / artifacts.LOCK_FILE).read_text(encoding="utf-8"))
        assert holder["pid"] == os.getpid()
        with pytest.raises(artifacts.PromotionLockedError), artifacts.promotion_lock(tmp_path):
            pass
    assert not (tmp_path / artifacts.LOCK_FILE).exists()


def test_the_lock_is_released_when_promotion_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _seed_production(tmp_path)
    run_dir, _ = write_run(tmp_path, "readmission", _model(), _result())

    def broken_copy(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(artifacts.shutil, "copyfile", broken_copy)
    with pytest.raises(OSError, match="disk full"):
        promote_to_current(
            tmp_path, run_dir, "readmission_model.joblib", "readmission_metrics.json"
        )
    assert not (tmp_path / artifacts.LOCK_FILE).exists()


def test_a_lock_held_by_another_process_blocks_promotion(tmp_path: Path) -> None:
    """Real cross-process contention: a child process holds the lock."""
    import subprocess
    import textwrap

    ready, release = tmp_path / "ready", tmp_path / "release"
    child = subprocess.Popen(
        [
            sys.executable,
            "-c",
            textwrap.dedent(
                f"""
                import sys, time
                from pathlib import Path
                sys.path.insert(0, {str(Path(artifacts.__file__).parents[2])!r})
                from src.models.artifacts import promotion_lock
                with promotion_lock(Path({str(tmp_path)!r})):
                    Path({str(ready)!r}).touch()
                    while not Path({str(release)!r}).exists():
                        time.sleep(0.05)
                """
            ),
        ]
    )
    try:
        for _ in range(400):
            if ready.exists():
                break
            child.poll()
            assert child.returncode is None, "lock-holding child exited early"
            import time

            time.sleep(0.05)
        assert ready.exists()
        # On Windows a venv python.exe re-launches the base interpreter, so the
        # recorded holder PID is not necessarily child.pid - only "not us".
        holder = json.loads((tmp_path / artifacts.LOCK_FILE).read_text(encoding="utf-8"))
        assert holder["pid"] != os.getpid()
        with (
            pytest.raises(artifacts.PromotionLockedError, match=str(holder["pid"])),
            artifacts.promotion_lock(tmp_path),
        ):
            pass
    finally:
        release.touch()
        child.wait(timeout=60)
    assert child.returncode == 0
    assert not (tmp_path / artifacts.LOCK_FILE).exists()
