"""Shared reporting helpers for the CI check scripts.

Emits GitHub Actions annotations so failures land on the right line in the diff,
and appends a human readable block to the job summary.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field

IS_GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"


@dataclass
class Problem:
    """A single check failure."""

    message: str
    path: str | None = None
    line: int | None = None
    hint: str | None = None


@dataclass
class Report:
    """Collects problems and warnings for one check, then renders them."""

    check: str
    problems: list[Problem] = field(default_factory=list)
    warnings: list[Problem] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def fail(self, message: str, path: str | None = None, line: int | None = None,
             hint: str | None = None) -> None:
        """Record a blocking problem."""
        self.problems.append(Problem(message, path, line, hint))

    def warn(self, message: str, path: str | None = None, line: int | None = None,
             hint: str | None = None) -> None:
        """Record a non-blocking warning."""
        self.warnings.append(Problem(message, path, line, hint))

    def note(self, message: str) -> None:
        """Record an informational line for the job summary."""
        self.notes.append(message)

    @staticmethod
    def _annotate(level: str, item: Problem) -> None:
        location = ""
        if item.path:
            location = f" file={item.path}"
            if item.line:
                location += f",line={item.line}"
        text = item.message if not item.hint else f"{item.message} -- {item.hint}"
        text = text.replace("\n", " ")
        if IS_GITHUB:
            print(f"::{level}{location}::{text}")
        else:
            where = f"{item.path}:{item.line}" if item.line else (item.path or "")
            print(f"[{level}] {where} {text}".strip())

    @staticmethod
    def _where(item: Problem) -> str:
        """Render a problem's location for the job summary."""
        if not item.path:
            return ""
        return f"`{item.path}`" + (f" line {item.line}" if item.line else "")

    def _summary_lines(self) -> list[str]:
        lines = [f"### {self.check}", ""]
        if not self.problems and not self.warnings:
            lines.append("Passed.")
        for item in self.problems:
            lines.append(f"- **FAIL** {item.message} {self._where(item)}".rstrip())
            if item.hint:
                lines.append(f"  - {item.hint}")
        for item in self.warnings:
            lines.append(f"- warn: {item.message} {self._where(item)}".rstrip())
            if item.hint:
                lines.append(f"  - {item.hint}")
        for note in self.notes:
            lines.append(f"- {note}")
        lines.append("")
        return lines

    def finish(self) -> int:
        """Print annotations, append the job summary and return an exit code."""
        for item in self.warnings:
            self._annotate("warning", item)
        for item in self.problems:
            self._annotate("error", item)

        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            with open(summary_path, "a", encoding="utf-8") as handle:
                handle.write("\n".join(self._summary_lines()) + "\n")

        if self.problems:
            print(f"\n{self.check}: {len(self.problems)} problem(s) found.", file=sys.stderr)
            return 1
        print(f"{self.check}: OK ({len(self.warnings)} warning(s)).")
        return 0


def write_summary(markdown: str) -> None:
    """Append free-form markdown to the GitHub Actions job summary.

    The Report class above is for pass/fail checks. Some scripts - the cohort
    report, for one - produce a document rather than a verdict, and this is how
    they get it onto the run summary page.
    """
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(markdown.rstrip() + "\n")
    else:
        print(markdown)


def warn_annotation(message: str) -> None:
    """Emit a standalone workflow warning."""
    if IS_GITHUB:
        print(f"::warning::{message}")
    else:
        print(f"[warning] {message}")
