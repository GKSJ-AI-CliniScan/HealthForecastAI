"""Shared roster parsing for the CI checks.

Reads .github/interns.yml without needing PyYAML installed. The roster uses a
deliberately simple one-line-per-intern format so this regex parser stays
reliable and the checks keep working on a bare runner.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from _walk import repo_root

ROSTER_RELATIVE = Path(".github/interns.yml")

_ENTRY = re.compile(
    r'-\s*\{\s*id:\s*"(?P<id>[^"]+)"\s*,'
    r'\s*name:\s*"(?P<name>[^"]+)"\s*,'
    r'\s*branch:\s*"(?P<branch>[^"]+)"\s*\}'
)
_SCALAR = re.compile(r'^(?P<key>[a-z_]+):\s*"(?P<value>[^"]*)"\s*$', re.MULTILINE)


@dataclass(frozen=True)
class Intern:
    """One intern and the branch they own."""

    id: str
    name: str
    branch: str


@dataclass(frozen=True)
class Roster:
    """The parsed roster file."""

    project: str
    domain: str
    protected_branch: str
    branch_prefix: str
    interns: list[Intern]

    def by_branch(self, branch: str) -> Intern | None:
        """Return the intern who owns a branch, or None."""
        for intern in self.interns:
            if intern.branch == branch:
                return intern
        return None

    @property
    def branches(self) -> list[str]:
        """Every branch name in the roster."""
        return [intern.branch for intern in self.interns]


def roster_path() -> Path:
    """Return the absolute path of the roster file."""
    return repo_root() / ROSTER_RELATIVE


def load(path: Path | None = None) -> Roster:
    """Parse the roster. Raises when it is missing or unparseable."""
    target = path or roster_path()
    if not target.exists():
        raise FileNotFoundError(f"roster file not found: {ROSTER_RELATIVE}")

    text = target.read_text(encoding="utf-8")
    scalars = {m.group("key"): m.group("value") for m in _SCALAR.finditer(text)}
    interns = [
        Intern(id=m.group("id"), name=m.group("name"), branch=m.group("branch"))
        for m in _ENTRY.finditer(text)
    ]

    if not interns:
        raise ValueError(
            f"no intern entries parsed from {ROSTER_RELATIVE} - check the file format"
        )

    return Roster(
        project=scalars.get("project", "HealthForecast AI"),
        domain=scalars.get("domain", "AI"),
        protected_branch=scalars.get("protected_branch", "main"),
        branch_prefix=scalars.get("branch_prefix", "intern/"),
        interns=interns,
    )
