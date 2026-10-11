#!/usr/bin/env python
"""Load a hospital admissions export into PostgreSQL.

Run the Alembic migrations first. The Diabetes 130-US export is one CSV:

    cd backend && alembic upgrade head && cd ..
    python scripts/import_dataset.py ml/data/raw/diabetic_data.csv --limit 500

The India Hospital Readmission export is relational (patients.csv,
admissions.csv, diagnoses.csv): point at its directory and say how many
patients to load. A full load (86,400 patients) must be asked for explicitly:

    python scripts/import_dataset.py ml/data/raw --profile india_hospital_readmission \
        --limit 50 --dry-run
    python scripts/import_dataset.py ml/data/raw --profile india_hospital_readmission --limit 50
    python scripts/import_dataset.py ml/data/raw --profile india_hospital_readmission --all

Every run is one transaction; --dry-run validates and reports, then rolls
back. Re-running the India import is idempotent. The datasets are never
committed to git - see ml/data/README.md.
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.session import SessionLocal  # noqa: E402
from app.services.dataset_import_service import (  # noqa: E402
    PROFILES,
    DatasetImportService,
    ImportSummary,
    RelationalDatasetImportService,
    RelationalDatasetProfile,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "path", help="Raw CSV (single-file exports) or export directory (relational)"
    )
    parser.add_argument(
        "--profile",
        default="diabetes_130_us",
        choices=sorted(PROFILES),
        help="Which source export this is (default: diabetes_130_us)",
    )
    size = parser.add_mutually_exclusive_group()
    size.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Rows (single-file) or patients with their full history (relational) to load",
    )
    size.add_argument(
        "--all",
        action="store_true",
        help="Relational exports only: load every patient (required instead of --limit)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and report what would be imported, then roll back",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    profile = PROFILES[args.profile]

    if isinstance(profile, RelationalDatasetProfile) and args.limit is None and not args.all:
        parser.error(
            f"{profile.name} is a large relational export: pass --limit N (patients) "
            "for a development subset, or --all to load everything."
        )

    session = SessionLocal()
    try:
        summary: ImportSummary
        if isinstance(profile, RelationalDatasetProfile):
            summary = RelationalDatasetImportService(session, profile).import_export(
                args.path, patient_limit=args.limit, dry_run=args.dry_run
            )
        else:
            summary = DatasetImportService(session, profile).import_csv(
                args.path, args.limit, dry_run=args.dry_run
            )
    finally:
        session.close()

    print(json.dumps(summary.as_dict(), indent=2))
    if summary.dry_run:
        print("\nDry run: nothing was written.")
    if profile.unmapped_note:
        print(f"\nNote: {profile.unmapped_note}")
    if summary.missing_columns:
        print(f"\nColumns absent from this export: {', '.join(summary.missing_columns)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
