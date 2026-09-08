#!/usr/bin/env python3
"""Build a mentor-facing progress table across all 26 intern branches.

Nothing is merged into main, so there is no single place to see how the cohort is
doing. This walks the roster - not the list of branches that happen to exist - so
an intern who never created a branch shows up as a gap rather than as silence.

For each intern it reports whether the branch exists, how many commits it is
ahead of main, the last CI conclusion, and how long since the last push, then
summarises who needs chasing.

Needs GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_API_URL in the environment -
GitHub Actions provides all three. Standard library only.

Usage: python scripts/ci/cohort_report.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from typing import Any

import roster
from _report import warn_annotation, write_summary

API = os.environ.get("GITHUB_API_URL", "https://api.github.com")
REPO = os.environ.get("GITHUB_REPOSITORY", "")
TOKEN = os.environ.get("GITHUB_TOKEN", "")

STALE_DAYS = 7


def api_get(path: str, params: dict[str, str] | None = None) -> Any:
    """GET a GitHub API path. Returns None on 404 or any transport failure."""
    url = f"{API}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    request = urllib.request.Request(url)
    request.add_header("Accept", "application/vnd.github+json")
    request.add_header("X-GitHub-Api-Version", "2022-11-28")
    if TOKEN:
        request.add_header("Authorization", f"Bearer {TOKEN}")

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None  # a branch that does not exist is expected, not an error
        warn_annotation(f"GitHub API {exc.code} for {path}")
        return None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        warn_annotation(f"GitHub API call failed for {path}: {exc}")
        return None


def days_since(iso: str | None) -> tuple[str, int | None]:
    """Return a human phrase and the raw day count for an ISO timestamp."""
    if not iso:
        return "-", None
    try:
        when = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return "-", None

    days = (datetime.now(UTC) - when).days
    if days <= 0:
        return "today", 0
    if days == 1:
        return "1 day ago", 1
    return f"{days} days ago", days


def branch_status(branch: str) -> dict[str, Any]:
    """Return what the API knows about one intern branch."""
    encoded = urllib.parse.quote(branch, safe="")

    info = api_get(f"/repos/{REPO}/branches/{encoded}")
    if info is None:
        return {"exists": False, "last_commit": "-", "days": None, "commits": "-", "ci": "-"}

    commit = info.get("commit", {}).get("commit", {})
    author = commit.get("author", {}) or {}
    phrase, days = days_since(author.get("date"))

    # Commits ahead of main is what the intern has actually added.
    comparison = api_get(f"/repos/{REPO}/compare/main...{encoded}")
    ahead = str(comparison.get("ahead_by", "-")) if comparison else "-"

    runs = api_get(
        f"/repos/{REPO}/actions/runs",
        {"branch": branch, "per_page": "1", "event": "push"},
    )
    conclusion = "-"
    if runs and runs.get("workflow_runs"):
        run = runs["workflow_runs"][0]
        conclusion = run.get("conclusion") or run.get("status") or "-"

    return {
        "exists": True,
        "last_commit": phrase,
        "days": days,
        "commits": ahead,
        "ci": conclusion,
    }


def main() -> int:
    """Build the cohort report."""
    if not REPO:
        warn_annotation("GITHUB_REPOSITORY is not set - cannot query the API.")
        return 0

    data = roster.load()

    rows = [
        "| # | Intern | Branch | Started | Commits | Last CI | Last push |",
        "|---|---|---|---|---|---|---|",
    ]
    not_started: list[str] = []
    failing: list[str] = []
    stale: list[str] = []
    no_ci: list[str] = []

    for intern in data.interns:
        status = branch_status(intern.branch)

        if not status["exists"]:
            not_started.append(intern.name)
        else:
            if status["ci"] == "failure":
                failing.append(intern.name)
            elif status["ci"] == "-":
                no_ci.append(intern.name)
            if status["days"] is not None and status["days"] >= STALE_DAYS:
                stale.append(f"{intern.name} ({status['days']}d)")

        rows.append(
            f"| {intern.id} | {intern.name} | `{intern.branch}` "
            f"| {'yes' if status['exists'] else '**no**'} "
            f"| {status['commits']} | {status['ci']} | {status['last_commit']} |"
        )

    started = len(data.interns) - len(not_started)
    generated = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

    def listing(names: list[str]) -> str:
        return ", ".join(names) if names else "none"

    lines = [
        f"# HealthForecast AI cohort report - {len(data.interns)} interns",
        "",
        f"Generated {generated}. {started} of {len(data.interns)} branches created.",
        "",
        *rows,
        "",
        "## Needs attention",
        "",
        f"- **Branch not created yet ({len(not_started)}):** {listing(not_started)}",
        f"- **Last CI run failing ({len(failing)}):** {listing(failing)}",
        f"- **No CI run yet ({len(no_ci)}):** {listing(no_ci)}",
        f"- **No push in {STALE_DAYS}+ days ({len(stale)}):** {listing(stale)}",
        "",
        "Branch names come from `.github/interns.yml`. An intern missing here has "
        "not pushed under their roster name - check they are not on an old branch.",
        "",
    ]

    write_summary("\n".join(lines))
    print(f"Cohort report: {started}/{len(data.interns)} started, {len(failing)} failing.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
