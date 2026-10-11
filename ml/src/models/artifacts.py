"""Write-once, versioned model artefacts.

Every training run is saved to its own directory,
``<output_dir>/runs/<target>/<version_id>/`` holding ``model.joblib`` and
``metrics.json``. The directory is built under a ``.partial`` name and renamed
into place only once both files are complete, so an interrupted save never
leaves a half-written run that looks valid. Run directories are never
overwritten.

The shared ``<target>_model.joblib`` / ``<target>_metrics.json`` files in
``output_dir`` are a convenience copy of the latest PROMOTED run only. A run
that fails the promotion thresholds is kept in ``runs/`` but never replaces
them. The metrics copy is swapped in first and records the run directory and
the model's sha256, so scripts/register_model.py always registers the
immutable run file - even if an update is interrupted between the two swaps.
Promotion holds ``output_dir/.promote.lock`` so two processes cannot
interleave their swaps.

Durability: file contents are fsynced before they are published on every
platform. Directory entries (the renames that publish them) are fsynced only
where the OS supports it - see ``fsync_dir``. On Windows a crash leaves each
rename either done or not done (NTFS journals it), but a very recent rename
may be lost on power failure.
"""

import errno
import hashlib
import json
import os
import shutil
import socket
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib

RUNS_DIR = "runs"
MODEL_FILE = "model.joblib"
METRICS_FILE = "metrics.json"
LOCK_FILE = ".promote.lock"

# POSIX lets a directory be opened and fsynced to make the renames inside it
# durable. Windows has no portable equivalent in the standard library.
DIR_FSYNC_SUPPORTED = os.name == "posix"
# Filesystems that cannot fsync a directory report one of these; that is "not
# supported here", not a failed flush.
_DIR_FSYNC_UNSUPPORTED_ERRNOS = {errno.EINVAL, errno.ENOTSUP, errno.EOPNOTSUPP}


class PromotionLockedError(RuntimeError):
    """Another process holds the promotion lock (or left it behind)."""


def version_id(trained_at: str) -> str:
    """A filesystem-safe id for an ISO ``trained_at`` timestamp."""
    return datetime.fromisoformat(trained_at).strftime("%Y%m%dT%H%M%S%fZ")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def flush_to_disk(path: Path) -> None:
    """fsync a written file so a later rename cannot publish unflushed data."""
    with open(path, "rb+") as handle:
        os.fsync(handle.fileno())


def fsync_dir(path: Path) -> bool:
    """Make the entries of directory ``path`` (renames, new files) durable.

    Returns True when the directory was flushed, False when the platform or
    filesystem cannot flush a directory (Windows; or EINVAL/ENOTSUP from the
    filesystem) - the caller then has only the OS's own guarantees. Any other
    OSError is a real flush failure and is raised.
    """
    if not DIR_FSYNC_SUPPORTED:
        return False
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(fd)
    except OSError as exc:
        if exc.errno in _DIR_FSYNC_UNSUPPORTED_ERRNOS:
            return False
        raise
    finally:
        os.close(fd)
    return True


def run_directory(output_dir: Path, target: str, trained_at: str) -> Path:
    return Path(output_dir) / RUNS_DIR / target / version_id(trained_at)


def write_run(
    output_dir: Path, target: str, model: Any, result: dict[str, Any]
) -> tuple[Path, dict[str, Any]]:
    """Save one run to its own directory; return (run_dir, result with ``artifact``).

    Raises FileExistsError rather than overwrite an existing run. On any
    failure before publication the run's own ``.partial`` directory is
    removed and the error re-raised; nothing outside it is touched. If only
    the final directory flush fails, the complete run stays published and
    the error is raised so the run is not promoted.
    """
    run_dir = run_directory(output_dir, target, result["trained_at"])
    if run_dir.exists():
        raise FileExistsError(f"{run_dir} already exists; runs are never overwritten.")
    partial = run_dir.with_name(run_dir.name + ".partial")
    partial.parent.mkdir(parents=True, exist_ok=True)
    partial.mkdir()
    try:
        joblib.dump(model, partial / MODEL_FILE)
        recorded = dict(result)
        recorded["artifact"] = {
            "run_dir": run_dir.relative_to(output_dir).as_posix(),
            "model_file": MODEL_FILE,
            "sha256": sha256_file(partial / MODEL_FILE),
        }
        (partial / METRICS_FILE).write_text(json.dumps(recorded, indent=2), encoding="utf-8")
        flush_to_disk(partial / MODEL_FILE)
        flush_to_disk(partial / METRICS_FILE)
        fsync_dir(partial)  # the two new entries inside the run directory
        os.rename(partial, run_dir)
    except BaseException:
        shutil.rmtree(partial, ignore_errors=True)
        raise
    fsync_dir(run_dir.parent)  # the rename that publishes the run
    return run_dir, recorded


@contextmanager
def promotion_lock(output_dir: Path) -> Iterator[None]:
    """Hold ``output_dir/.promote.lock`` for the duration of a promotion.

    The lock file is created with O_CREAT|O_EXCL, which is atomic on local
    filesystems on both Windows and POSIX, and removed on exit - including
    on exceptions and KeyboardInterrupt. A process that is killed outright
    (or a power loss) leaves the file behind; it is never removed
    automatically, because a live holder cannot be told apart reliably from
    a dead one (PIDs are reused, and the holder may be on another machine).
    PromotionLockedError names the recorded holder; remove the file by hand once
    no training process is running.
    """
    lock = Path(output_dir) / LOCK_FILE
    holder = {
        "pid": os.getpid(),
        "host": socket.gethostname(),
        "since": datetime.now(UTC).isoformat(),
    }
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        try:
            recorded = lock.read_text(encoding="utf-8").strip() or "unknown holder"
        except OSError:
            recorded = "unreadable lock file"
        raise PromotionLockedError(
            f"{lock} exists ({recorded}): another promotion is in progress or one was "
            "interrupted. If no training process is running, delete that file by hand."
        ) from None
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(holder, handle)
        yield
    finally:
        lock.unlink(missing_ok=True)


def promote_to_current(
    output_dir: Path, run_dir: Path, model_filename: str, metrics_filename: str
) -> None:
    """Point the shared current files at ``run_dir`` (call for promoted runs only).

    Runs under ``promotion_lock``. Each file is copied to a temporary name,
    flushed, and swapped in with os.replace, so a reader sees either the old
    or the new file, never a partial one; the directory is flushed after each
    swap where supported. Metrics go first: they name the run directory,
    which is what registration uses, so an interruption before the model
    swap cannot mismatch a model with another run's metrics. Anything else
    reading the shared pair should check the model's sha256 against
    ``metrics["artifact"]["sha256"]``: after such an interruption the shared
    model file is still the previous one.
    """
    output_dir = Path(output_dir)
    with promotion_lock(output_dir):
        for source, destination in (
            (METRICS_FILE, metrics_filename),
            (MODEL_FILE, model_filename),
        ):
            incoming = output_dir / f".{destination}.incoming"
            try:
                shutil.copyfile(run_dir / source, incoming)
                flush_to_disk(incoming)
                os.replace(incoming, output_dir / destination)
            except BaseException:
                incoming.unlink(missing_ok=True)
                raise
            fsync_dir(output_dir)
