"""Reject files that must never enter the repository.

Covers the three things that actually go wrong on a shared student repo:
oversized binaries, committed datasets or model artifacts, and files whose names
suggest they hold real patient data or credentials.

Usage: python scripts/ci/check_files.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from _report import Report
from _walk import rel, tracked_files

MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB - blocks the push
WARN_FILE_BYTES = 1 * 1024 * 1024  # 1 MB - flagged for review

DATA_SUFFIXES = {
    ".csv",
    ".tsv",
    ".parquet",
    ".feather",
    ".xlsx",
    ".xls",
    ".sav",
    ".dta",
}
ARTIFACT_SUFFIXES = {
    ".pkl",
    ".pickle",
    ".joblib",
    ".h5",
    ".hdf5",
    ".keras",
    ".pt",
    ".pth",
    ".onnx",
    ".pb",
    ".ckpt",
    ".model",
    ".bin",
}
CREDENTIAL_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".ppk"}
DB_SUFFIXES = {".db", ".sqlite", ".sqlite3", ".mdb", ".accdb"}

# Files that are legitimately large and legitimately committed.
SIZE_ALLOWLIST = {
    "docs/brief/",
}

# Data files that are legitimately part of the project.
DATA_ALLOWLIST = {
    "docs/",
    "database/postgres/seeds/",
    "database/mongodb/seeds/",
}

PHI_NAME_HINTS = (
    "patient_data",
    "patients_real",
    "phi_",
    "_phi",
    "mrn_",
    "ssn",
    "identifiable",
    "real_patient",
)


def is_allowlisted(path: str) -> bool:
    """Return True when a data file sits in a directory that permits one."""
    return any(path.startswith(prefix) for prefix in DATA_ALLOWLIST)


def main() -> int:
    """Run the file policy check."""
    report = Report("Committed file policy")
    checked = 0

    for file_path in tracked_files():
        if not file_path.is_file():
            continue
        checked += 1
        relative = rel(file_path)
        suffix = Path(relative).suffix.lower()
        lowered = relative.lower()
        size = file_path.stat().st_size

        if size > MAX_FILE_BYTES:
            report.fail(
                f"File is {size / 1024 / 1024:.1f} MB - the limit is "
                f"{MAX_FILE_BYTES // 1024 // 1024} MB",
                path=relative,
                hint="Keep large binaries out of git. Link to storage instead.",
            )
        elif size > WARN_FILE_BYTES and not any(
            relative.startswith(prefix) for prefix in SIZE_ALLOWLIST
        ):
            report.warn(f"Large file ({size / 1024 / 1024:.1f} MB)", path=relative)

        if suffix in DATA_SUFFIXES and not is_allowlisted(relative):
            report.fail(
                f"Dataset file committed ({suffix})",
                path=relative,
                hint="Datasets are never committed. See ml/data/README.md.",
            )

        if suffix in ARTIFACT_SUFFIXES:
            report.fail(
                f"Model artifact committed ({suffix})",
                path=relative,
                hint="Artifacts belong in ml/artifacts/, which is gitignored. "
                "Put the metrics in your milestone report instead.",
            )

        if suffix in CREDENTIAL_SUFFIXES:
            report.fail(
                f"Credential file committed ({suffix})",
                path=relative,
                hint="Delete it and rotate the key immediately - it is now in git history.",
            )

        if suffix in DB_SUFFIXES:
            report.fail(
                f"Database file committed ({suffix})",
                path=relative,
                hint="Use the Postgres or MongoDB service from docker-compose.yml.",
            )

        if any(hint in lowered for hint in PHI_NAME_HINTS):
            report.fail(
                "File name suggests it holds identifiable patient data",
                path=relative,
                hint="Real patient data must never be committed. Rename or remove the file.",
            )

    report.note(f"Checked {checked} tracked files.")
    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
