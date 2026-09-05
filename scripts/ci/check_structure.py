"""Verify that the repository still has the agreed folder structure.

Interns add files inside this structure. Renaming or deleting a top level
directory breaks everybody else's mental model and every path in the docs, so
CI blocks it.

Usage: python scripts/ci/check_structure.py
"""

from __future__ import annotations

import sys

from _report import Report
from _walk import rel, repo_root, tracked_files

# Directories that must exist on every branch.
REQUIRED_DIRS = [
    ".github/workflows",
    "backend/app",
    "backend/tests",
    "frontend/src",
    "ml/src",
    "ml/tests",
    "database",
    "docs",
    "docs/06-milestones",
    "deployment",
    "scripts/ci",
]

# Files that must exist on every branch.
REQUIRED_FILES = [
    ".github/interns.yml",
    ".gitignore",
    ".env.example",
    "README.md",
    "INTERN_GUIDE.md",
    "docker-compose.yml",
    "backend/requirements.txt",
    "backend/app/main.py",
    "frontend/package.json",
    "ml/requirements.txt",
    "ml/configs/config.yaml",
]

# Files that must never be committed, whatever the reason given.
FORBIDDEN_FILES = [
    ".env",
    "backend/.env",
    "frontend/.env",
    "frontend/.env.local",
    "ml/.env",
]


def main() -> int:
    """Run the structure check."""
    report = Report("Repository structure")
    root = repo_root()

    for relative in REQUIRED_DIRS:
        if not (root / relative).is_dir():
            report.fail(
                f"Required directory is missing: {relative}",
                hint="Restore it from main: git checkout origin/main -- " + relative,
            )

    for relative in REQUIRED_FILES:
        if not (root / relative).is_file():
            report.fail(
                f"Required file is missing: {relative}",
                path=relative,
                hint="Restore it from main: git checkout origin/main -- " + relative,
            )

    # Only tracked files count. A developer's own .env or .env.local sitting in
    # the working tree is normal and gitignored - failing on that would train
    # people to ignore this check. What matters is whether it reached git.
    tracked = {rel(path) for path in tracked_files()}
    for relative in FORBIDDEN_FILES:
        if relative in tracked:
            report.fail(
                f"Environment file committed: {relative}",
                path=relative,
                hint="Remove it with `git rm --cached`, rotate any credential it "
                "contained, and use .env.example instead.",
            )

    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
