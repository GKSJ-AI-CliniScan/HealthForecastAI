"""Verify the pushed branch belongs to a known intern.

Every intern works on their own branch and nothing is merged into main, so the
branch name is the only thing tying a submission to a person. A branch that is
not in the roster means work would be graded against nobody - or worse, against
the wrong person.

The roster in `.github/interns.yml` is the single source of truth. This replaced
an earlier pattern-only check: `intern/<name>` matched anything shaped like a
name, so `intern/john` and `intern/jhon-smyth` both passed and neither could be
attributed with confidence.

Usage: python scripts/ci/check_branch.py <branch-name>
"""

from __future__ import annotations

import difflib
import os
import sys

import roster
from _report import Report

# Branches mentors and maintainers may use alongside the intern branches.
MENTOR_PREFIXES = ("mentor/", "ci/", "docs/", "hotfix/", "release/")


def resolve_branch() -> str:
    """Return the branch under test from argv or the GitHub environment."""
    if len(sys.argv) > 1 and sys.argv[1].strip():
        return sys.argv[1].strip()
    head = os.environ.get("GITHUB_HEAD_REF", "").strip()
    if head:
        return head
    return os.environ.get("GITHUB_REF_NAME", "").strip()


def main() -> int:
    """Run the branch policy check."""
    report = Report("Branch policy")
    branch = resolve_branch()

    if not branch:
        report.warn("Could not determine the branch name - skipping the check.")
        return report.finish()

    try:
        data = roster.load()
    except (FileNotFoundError, ValueError) as exc:
        report.fail(
            f"Cannot read the intern roster: {exc}",
            path=".github/interns.yml",
            hint="Restore it from main: git checkout origin/main -- .github/interns.yml",
        )
        return report.finish()

    report.note(f"Branch: `{branch}`")

    if branch == data.protected_branch:
        report.note(f"`{branch}` is the protected mentor branch - allowed.")
        return report.finish()

    if branch.startswith(MENTOR_PREFIXES):
        report.note(f"`{branch}` is a maintainer branch - allowed.")
        return report.finish()

    intern = data.by_branch(branch)
    if intern is not None:
        report.note(f"Recognised: **{intern.name}** (#{intern.id})")
        return report.finish()

    suggestions = difflib.get_close_matches(branch, data.branches, n=3, cutoff=0.4)
    hint = (
        f"Use the exact branch listed for you in .github/interns.yml - "
        f"'{data.branch_prefix}NN-firstname-lastname'."
    )
    if suggestions:
        hint += " Did you mean: " + ", ".join(suggestions) + "?"

    report.fail(
        f"Branch '{branch}' is not in the intern roster",
        hint=hint,
    )
    report.note("")
    report.note("Rename it to your roster name:")
    report.note("")
    report.note("```bash")
    report.note("git branch -m <your-roster-branch-name>")
    report.note("git push origin -u <your-roster-branch-name>")
    report.note(f"git push origin --delete {branch}")
    report.note("```")
    if suggestions:
        report.note("")
        report.note("Closest matches in the roster:")
        for suggestion in suggestions:
            owner = data.by_branch(suggestion)
            report.note(f"- `{suggestion}`" + (f" - {owner.name}" if owner else ""))

    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
