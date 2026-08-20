"""Report milestone progress from docs/06-milestones/.

Non-blocking on main and on a template that has not been filled in yet. It turns
red only when a report exists but is missing a required section, so a submitted
report is always complete enough to grade.

Usage: python scripts/ci/check_milestones.py
"""

from __future__ import annotations

import re
import sys

from _report import Report
from _walk import repo_root

MILESTONE_DIR = "docs/06-milestones"

REQUIRED_SECTIONS = [
    "What I built",
    "How to run it",
    "Evidence",
    "Metrics",
    "Known gaps",
]

PLACEHOLDER_MARKER = "_Not started_"
MIN_WORDS = 80


def main() -> int:
    """Run the milestone report check."""
    report = Report("Milestone reports")
    root = repo_root()
    directory = root / MILESTONE_DIR

    if not directory.is_dir():
        report.fail(f"Missing directory: {MILESTONE_DIR}")
        return report.finish()

    files = sorted(directory.glob("milestone-*.md"))
    if not files:
        report.fail(f"No milestone report templates found in {MILESTONE_DIR}")
        return report.finish()

    started = 0
    for path in files:
        relative = f"{MILESTONE_DIR}/{path.name}"
        text = path.read_text(encoding="utf-8", errors="ignore")
        body = re.sub(r"^---.*?---", "", text, count=1, flags=re.DOTALL)
        words = len(body.split())

        if PLACEHOLDER_MARKER in text or words < MIN_WORDS:
            report.note(f"`{path.name}` - not started yet")
            continue

        started += 1
        missing = [s for s in REQUIRED_SECTIONS if s.lower() not in text.lower()]
        if missing:
            report.fail(
                f"{path.name} is missing required section(s): {', '.join(missing)}",
                path=relative,
                hint="Keep every heading from the template, even if the answer is short.",
            )
        else:
            report.note(f"`{path.name}` - submitted ({words} words)")

    report.note(f"{started} of {len(files)} milestone reports submitted.")
    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
