#!/usr/bin/env python
"""Load a hospital admissions export into PostgreSQL.

Run the Alembic migrations first, then point this at a raw CSV:

    cd backend && alembic upgrade head && cd ..
    python scripts/import_dataset.py ml/data/raw/diabetic_data.csv

Use --limit to seed a small development dataset instead of the whole export:

    python scripts/import_dataset.py ml/data/raw/diabetic_data.csv --limit 500

The dataset itself is never committed to git. See ml/data/README.md for the
download instructions.
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.db.session import SessionLocal  # noqa: E402
from app.services.dataset_import_service import PROFILES, DatasetImportService  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", help="Path to the raw dataset CSV")
    parser.add_argument(
        "--profile",
        default="diabetes_130_us",
        choices=sorted(PROFILES),
        help="Which source export the CSV is (default: diabetes_130_us)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Import only the first N rows, for seeding a development database",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    profile = PROFILES[args.profile]

    session = SessionLocal()
    try:
        summary = DatasetImportService(session, profile).import_csv(args.csv_path, args.limit)
    finally:
        session.close()

    print(json.dumps(summary.as_dict(), indent=2))
    if profile.unmapped_note:
        print(f"\nNote: {profile.unmapped_note}")
    if summary.missing_columns:
        print(f"\nColumns absent from this export: {', '.join(summary.missing_columns)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
