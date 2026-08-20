"""Validate the branch name and protect the main branch.

Every intern works on their own branch. Nothing is merged into main, so a branch
name is the only way to tell whose work CI is looking at - it has to be readable.

Usage: python scripts/ci/check_branch.py <branch-name>
"""

from __future__ import annotations

import os
import re
import sys

from _report import Report

PROTECTED = {"main", "master", "develop"}

# intern/firstname-lastname  or  intern/firstname-lastname/feature-name
PATTERN = re.compile(r"^intern/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)?$")

EXAMPLE = "intern/mamidi-srija-reddy"


def resolve_branch() -> str:
    """Return the branch under test from argv or the GitHub environment."""
    if len(sys.argv) > 1 and sys.argv[1].strip():
        return sys.argv[1].strip()
    head = os.environ.get("GITHUB_HEAD_REF", "").strip()
    if head:
        return head
    ref = os.environ.get("GITHUB_REF_NAME", "").strip()
    return ref


def main() -> int:
    """Run the branch name check."""
    report = Report("Branch naming")
    branch = resolve_branch()

    if not branch:
        report.warn("Could not determine the branch name - skipping the check.")
        return report.finish()

    report.note(f"Branch: `{branch}`")

    if branch in PROTECTED:
        report.note("Protected branch - naming rules do not apply.")
        return report.finish()

    if not PATTERN.match(branch):
        report.fail(
            f"Branch name '{branch}' does not follow the required pattern",
            hint=(
                "Use intern/<your-name> in lowercase with hyphens, for example "
                f"'{EXAMPLE}'. Optionally add a feature: '{EXAMPLE}/risk-dashboard'. "
                "Rename with: git branch -m <new-name> && git push origin -u <new-name>"
            ),
        )

    if len(branch) > 80:
        report.fail(f"Branch name is {len(branch)} characters - keep it under 80.")

    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
