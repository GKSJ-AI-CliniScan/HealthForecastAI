"""Scan tracked text files for committed credentials.

Deliberately conservative: every pattern here is high signal, because a check
that cries wolf gets ignored. Local development placeholders - a Postgres URL
pointing at localhost, a value of "change-me" - are allowed.

Usage: python scripts/ci/check_secrets.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from _report import Report
from _walk import rel, tracked_files

SCAN_SUFFIXES = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".yml",
    ".yaml",
    ".md",
    ".sql",
    ".sh",
    ".env",
    ".ini",
    ".cfg",
    ".toml",
    ".txt",
    ".ipynb",
    ".tf",
    ".conf",
    ".properties",
    ".xml",
    ".html",
    ".css",
}

SKIP_PATHS = (
    "scripts/ci/check_secrets.py",
    "frontend/package-lock.json",
    "docs/brief/",
)

# Values that are obviously placeholders rather than real credentials.
PLACEHOLDER = re.compile(
    r"(change[-_ ]?me|your[-_ ]?|<[^>]{2,40}>|xxx+|placeholder|example|dummy|sample|"
    r"todo|fake|test[-_]?(secret|key|token)|\$\{|\{\{|process\.env|os\.environ|"
    r"getenv|secrets\.|redacted|\*{4,})",
    re.IGNORECASE,
)

# A database URL pointing at one of these is a local development default, not a
# leak. Anything else - an Atlas cluster, an RDS endpoint - is worth flagging.
LOCAL_HOSTS = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "host.docker.internal",
    # docker-compose service names used by this project
    "postgres",
    "postgresql",
    "mongo",
    "mongodb",
    "db",
    "database",
    "backend",
}

DB_URL = re.compile(
    r"\b(?P<scheme>postgres(?:ql)?|mysql|mongodb)(?:\+\w+)?://"
    r"(?P<user>[^\s:/@]+):(?P<password>[^\s:/@]+)@(?P<host>[^\s:/?]+)",
    re.IGNORECASE,
)

PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    (
        "AWS access key id",
        re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
        "Rotate it in IAM now, then remove it from git history.",
    ),
    (
        "AWS secret access key",
        re.compile(
            r"aws_secret_access_key\s*[:=]\s*['\"]?([A-Za-z0-9/+=]{40})['\"]?", re.IGNORECASE
        ),
        "Rotate it in IAM now.",
    ),
    (
        "Private key block",
        re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----"),
        "Delete the key and generate a new one.",
    ),
    (
        "GitHub token",
        re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
        "Revoke it at github.com/settings/tokens.",
    ),
    (
        "Slack token",
        re.compile(r"\bxox[abprs]-[0-9A-Za-z-]{10,}\b"),
        "Revoke it in Slack.",
    ),
    (
        "Google API key",
        re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
        "Revoke it in the Google Cloud console.",
    ),
    ("OpenAI-style API key", re.compile(r"\bsk-[A-Za-z0-9]{32,}\b"), "Revoke the key."),
    (
        "Anthropic API key",
        re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b"),
        "Revoke the key.",
    ),
    (
        "JSON Web Token",
        re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\."),
        "Tokens are short lived, but never commit one.",
    ),
    (
        "Hardcoded secret assignment",
        re.compile(
            r"\b(?:secret_key|api_key|apikey|access_token|auth_token|client_secret|"
            r"private_key|password|passwd)\s*[:=]\s*['\"]([^'\"\s]{12,})['\"]",
            re.IGNORECASE,
        ),
        "Read it from the environment instead.",
    ),
]


def should_skip(relative: str) -> bool:
    """Return True for paths that are not worth scanning."""
    return any(
        relative.startswith(prefix) or relative == prefix for prefix in SKIP_PATHS
    )


def check_database_urls(
    line: str, relative: str, line_number: int, report: Report
) -> None:
    """Flag database URLs that carry a password and point somewhere real."""
    for match in DB_URL.finditer(line):
        host = match.group("host").lower()
        if host in LOCAL_HOSTS:
            continue
        if PLACEHOLDER.search(match.group(0)):
            continue
        report.fail(
            f"Database URL with an embedded password for host '{host}'",
            path=relative,
            line=line_number,
            hint="Move the URL into .env and read it from settings.",
        )


def main() -> int:
    """Run the secret scan."""
    report = Report("Secret scan")
    scanned = 0

    for file_path in tracked_files():
        if not file_path.is_file():
            continue
        relative = rel(file_path)
        name = Path(relative).name
        if should_skip(relative):
            continue
        if (
            Path(relative).suffix.lower() not in SCAN_SUFFIXES
            and name != ".env.example"
        ):
            continue
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        scanned += 1

        for line_number, line in enumerate(text.splitlines(), start=1):
            if len(line) > 4000:
                continue

            check_database_urls(line, relative, line_number, report)

            for label, pattern, hint in PATTERNS:
                match = pattern.search(line)
                if not match:
                    continue
                if PLACEHOLDER.search(match.group(0)) or PLACEHOLDER.search(line):
                    continue
                report.fail(
                    f"Possible {label} committed",
                    path=relative,
                    line=line_number,
                    hint=hint,
                )

    report.note(f"Scanned {scanned} text files.")
    if report.problems:
        report.note(
            "Removing the line is not enough - the value stays in git history. "
            "Rotate the credential, then tell your mentor."
        )
    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
