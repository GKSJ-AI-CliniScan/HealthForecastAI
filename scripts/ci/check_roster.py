"""Validate the intern roster itself.

The roster decides who gets credit for what, so a malformed or inconsistent
entry is worse than a broken build - it silently misattributes work. This runs
on every push so a bad edit is caught immediately rather than at grading time.

Usage: python scripts/ci/check_roster.py
"""

from __future__ import annotations

import re
import sys
from collections import Counter

import roster
from _report import Report

EXPECTED_COUNT = 26
BRANCH_PATTERN = re.compile(r"^intern/(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$")


def slugify(name: str) -> str:
    """Return the branch slug a name should produce."""
    cleaned = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return re.sub(r"-{2,}", "-", cleaned)


def main() -> int:
    """Run the roster consistency check."""
    report = Report("Intern roster")

    try:
        data = roster.load()
    except (FileNotFoundError, ValueError) as exc:
        report.fail(str(exc), path=".github/interns.yml")
        return report.finish()

    report.note(f"Project: {data.project}")
    report.note(f"{len(data.interns)} intern(s) listed.")

    if len(data.interns) != EXPECTED_COUNT:
        report.warn(
            f"Roster has {len(data.interns)} entries, expected {EXPECTED_COUNT}",
            hint="Update EXPECTED_COUNT in this check if the cohort size changed.",
        )

    for field, values in (
        ("id", [i.id for i in data.interns]),
        ("branch", [i.branch for i in data.interns]),
        ("name", [i.name for i in data.interns]),
    ):
        duplicates = [value for value, count in Counter(values).items() if count > 1]
        for duplicate in duplicates:
            report.fail(
                f"Duplicate {field} in the roster: {duplicate!r}",
                path=".github/interns.yml",
                hint="Two interns cannot share this - work would be misattributed.",
            )

    for intern in data.interns:
        match = BRANCH_PATTERN.match(intern.branch)
        if not match:
            report.fail(
                f"Branch '{intern.branch}' does not match intern/NN-firstname-lastname",
                path=".github/interns.yml",
                hint="Lower case, zero-padded number, hyphen separated.",
            )
            continue

        if match.group(1) != intern.id:
            report.fail(
                f"Branch '{intern.branch}' carries number {match.group(1)} "
                f"but the entry id is {intern.id}",
                path=".github/interns.yml",
            )

        expected = f"{data.branch_prefix}{intern.id}-{slugify(intern.name)}"
        if intern.branch != expected:
            report.warn(
                f"Branch '{intern.branch}' does not match the slug of "
                f"'{intern.name}' (expected '{expected}')",
                path=".github/interns.yml",
                hint="Fine if deliberate - a preferred spelling, say - but check it.",
            )

        if not intern.id.isdigit() or len(intern.id) != 2:
            report.fail(
                f"Id {intern.id!r} is not a zero-padded two digit number",
                path=".github/interns.yml",
            )

    # The roster must never carry contact details. It needs a name and a branch.
    text = roster.roster_path().read_text(encoding="utf-8")
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text):
        report.fail(
            "The roster contains an email address",
            path=".github/interns.yml",
            hint="Names and branches only - personal contact details do not belong in git.",
        )

    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
