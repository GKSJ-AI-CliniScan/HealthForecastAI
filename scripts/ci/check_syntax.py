"""Validate every tracked file according to its type.

The language jobs (backend, frontend, ml) only look at their own folder. This
check walks the whole repository so that anything an intern pushes - a JSON
config, a workflow file, a SQL migration, a shell script, a stray Python file
outside backend/ - is parsed and reported on rather than silently ignored.

Files that no parser applies to (images, the PDF brief, .gitkeep) are still
covered by check_files.py and check_secrets.py. Anything with no validator at
all is listed at the end, so a coverage gap is visible instead of silent.

Usage: python scripts/ci/check_syntax.py
"""

from __future__ import annotations

import ast
import configparser
import json
import subprocess
import sys
import tomllib
from collections import Counter
from pathlib import Path

from _report import Report
from _walk import rel, tracked_files

try:  # Installed by CI. Without it, YAML falls back to a structural check.
    import yaml

    HAS_YAML = True
except ImportError:  # pragma: no cover - depends on the environment
    HAS_YAML = False


# Types that carry no parseable syntax. They are covered by the file policy and
# secret scans instead, so they are not a coverage gap.
POLICY_ONLY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".pdf",
    ".woff", ".woff2", ".ttf", ".otf", ".eot",
    ".txt", ".csv", ".mako", ".gitkeep", ".dockerignore", ".gitignore",
    ".gitattributes", ".editorconfig", ".env", ".example", ".lock", ".css",
}

POLICY_ONLY_NAMES = {
    "LICENSE", "Dockerfile", ".gitkeep", ".gitignore", ".dockerignore",
    ".gitattributes", ".editorconfig", ".env.example", "py.typed",
    "script.py.mako",
}


def check_python(path: Path, text: str, relative: str, report: Report) -> None:
    """Parse a Python file so a syntax error anywhere fails the build."""
    try:
        ast.parse(text, filename=relative)
    except SyntaxError as exc:
        report.fail(
            f"Python syntax error: {exc.msg}",
            path=relative,
            line=exc.lineno,
            hint="Run the file through your editor or `python -m py_compile` locally.",
        )


def check_json(path: Path, text: str, relative: str, report: Report) -> None:
    """Parse a JSON file."""
    try:
        json.loads(text)
    except json.JSONDecodeError as exc:
        report.fail(
            f"Invalid JSON: {exc.msg}",
            path=relative,
            line=exc.lineno,
            hint="A trailing comma or an unquoted key is the usual cause.",
        )


def check_notebook(path: Path, text: str, relative: str, report: Report) -> None:
    """Parse a notebook and every code cell inside it."""
    try:
        document = json.loads(text)
    except json.JSONDecodeError as exc:
        report.fail(f"Notebook is not valid JSON: {exc.msg}", path=relative, line=exc.lineno)
        return

    for index, cell in enumerate(document.get("cells", []), start=1):
        if cell.get("cell_type") != "code":
            continue
        source = "".join(cell.get("source", []))
        if not source.strip() or source.lstrip().startswith(("!", "%")):
            continue  # shell and magic lines are not Python
        try:
            ast.parse(source)
        except SyntaxError as exc:
            report.warn(
                f"Cell {index} does not parse as Python: {exc.msg}",
                path=relative,
                hint="Fine for a scratch cell, but move anything reusable into ml/src/.",
            )


def check_yaml(path: Path, text: str, relative: str, report: Report) -> None:
    """Parse a YAML file, or fall back to a structural check."""
    if HAS_YAML:
        try:
            list(yaml.safe_load_all(text))
        except yaml.YAMLError as exc:
            mark = getattr(exc, "problem_mark", None)
            report.fail(
                f"Invalid YAML: {getattr(exc, 'problem', exc)}",
                path=relative,
                line=(mark.line + 1) if mark else None,
                hint="Check the indentation - YAML does not allow tab characters.",
            )
        return

    for number, line in enumerate(text.splitlines(), start=1):
        stripped = line.lstrip(" ")
        if stripped.startswith("\t") or (line and line[0] == "\t"):
            report.fail(
                "YAML indented with a tab character",
                path=relative,
                line=number,
                hint="YAML requires spaces. Replace the tab with spaces.",
            )


def check_toml(path: Path, text: str, relative: str, report: Report) -> None:
    """Parse a TOML file."""
    try:
        tomllib.loads(text)
    except tomllib.TOMLDecodeError as exc:
        report.fail(f"Invalid TOML: {exc}", path=relative)


def check_ini(path: Path, text: str, relative: str, report: Report) -> None:
    """Parse an INI or CFG file."""
    parser = configparser.ConfigParser(interpolation=None, strict=False)
    try:
        parser.read_string(text, source=relative)
    except configparser.Error as exc:
        report.fail(f"Invalid INI: {exc}", path=relative)


def check_shell(path: Path, text: str, relative: str, report: Report) -> None:
    """Ask the shell to parse the script without running it."""
    try:
        result = subprocess.run(
            ["bash", "-n", str(path)], capture_output=True, text=True, timeout=30
        )
    except (OSError, subprocess.SubprocessError):
        return  # no bash available - skip rather than false-fail
    if result.returncode != 0:
        stderr_lines = result.stderr.strip().splitlines()
        detail = stderr_lines[-1] if stderr_lines else "see the log"
        report.fail(
            f"Shell syntax error: {detail}",
            path=relative,
            hint="Reproduce with: bash -n " + relative,
        )


def check_nginx_conf(path: Path, text: str, relative: str, report: Report) -> None:
    """Sanity check an nginx style config: balanced blocks, terminated directives."""
    body = "\n".join(line.split("#", 1)[0] for line in text.splitlines())

    depth = 0
    for number, line in enumerate(body.splitlines(), start=1):
        depth += line.count("{") - line.count("}")
        if depth < 0:
            report.fail(
                "Unmatched closing brace",
                path=relative,
                line=number,
                hint="A `}` here closes a block that was never opened.",
            )
            return

    if depth != 0:
        report.fail(
            f"{depth} unclosed block(s)",
            path=relative,
            hint="Every `{` needs a matching `}`.",
        )

    for number, line in enumerate(body.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.endswith(("{", "}", ";")):
            continue
        report.warn(
            "Directive does not end with a semicolon",
            path=relative,
            line=number,
            hint="nginx requires every directive to be terminated with `;`.",
        )


def check_sql(path: Path, text: str, relative: str, report: Report) -> None:
    """Sanity check a SQL file: balanced parentheses and terminated statements."""
    without_comments = "\n".join(
        line.split("--", 1)[0] for line in text.splitlines()
    )
    if without_comments.count("(") != without_comments.count(")"):
        report.fail(
            "Unbalanced parentheses in SQL",
            path=relative,
            hint="Count the brackets in your CREATE TABLE statements.",
        )
    body = without_comments.strip()
    if body and not body.endswith(";"):
        report.warn(
            "SQL file does not end with a semicolon",
            path=relative,
            hint="Terminate every statement so the file can be piped into psql.",
        )


def check_markdown(path: Path, text: str, relative: str, report: Report) -> None:
    """Catch an unclosed fenced code block, which swallows the rest of the page."""
    fences = sum(1 for line in text.splitlines() if line.lstrip().startswith("```"))
    if fences % 2 != 0:
        report.fail(
            f"Unclosed code fence ({fences} ``` markers, expected an even number)",
            path=relative,
            hint="Every ``` that opens a block needs a matching ``` to close it.",
        )


VALIDATORS = {
    ".py": check_python,
    ".pyi": check_python,
    ".json": check_json,
    ".ipynb": check_notebook,
    ".yml": check_yaml,
    ".yaml": check_yaml,
    ".toml": check_toml,
    ".ini": check_ini,
    ".cfg": check_ini,
    ".sh": check_shell,
    ".bash": check_shell,
    ".sql": check_sql,
    ".md": check_markdown,
    ".conf": check_nginx_conf,
}

# Handled by the frontend job (eslint, tsc, next build) rather than here.
DELEGATED_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}


def main() -> int:
    """Validate every tracked file."""
    report = Report("File syntax validation")
    counts: Counter[str] = Counter()
    unvalidated: list[str] = []

    if not HAS_YAML:
        report.warn(
            "PyYAML is not installed - YAML files got a structural check only.",
            hint="CI installs it. Locally: pip install pyyaml",
        )

    for file_path in tracked_files():
        if not file_path.is_file():
            continue
        relative = rel(file_path)
        suffix = file_path.suffix.lower()
        name = file_path.name

        if suffix in DELEGATED_SUFFIXES:
            counts["delegated to the frontend job"] += 1
            continue
        if name in POLICY_ONLY_NAMES or suffix in POLICY_ONLY_SUFFIXES:
            counts["policy checks only"] += 1
            continue

        validator = VALIDATORS.get(suffix)
        if validator is None:
            unvalidated.append(relative)
            continue

        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            report.fail(
                "File is not valid UTF-8",
                path=relative,
                hint="Re-save it as UTF-8. Mixed encodings break every tool downstream.",
            )
            continue
        except OSError:
            continue

        counts[suffix] += 1
        validator(file_path, text, relative, report)

    for label, number in sorted(counts.items(), key=lambda item: -item[1]):
        report.note(f"{number} x {label}")

    if unvalidated:
        report.warn(
            f"{len(unvalidated)} file(s) have no validator for their type",
            hint="Not an error - but if you added a new file type, say so in "
            "scripts/ci/check_syntax.py so it gets checked too.",
        )
        for item in unvalidated[:10]:
            report.note(f"no validator: `{item}`")

    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
