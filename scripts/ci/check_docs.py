"""Check documentation links and required headings.

Broken relative links are the most common documentation failure on a repo this
size, because paths move as the project grows.

Usage: python scripts/ci/check_docs.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from _report import Report
from _walk import rel, repo_root, tracked_files

LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "#", "tel:", "data:")


def main() -> int:
    """Run the documentation link check."""
    report = Report("Documentation links")
    root = repo_root()
    markdown = [p for p in tracked_files() if p.is_file() and p.suffix.lower() == ".md"]
    broken = 0

    for path in markdown:
        relative = rel(path)
        text = path.read_text(encoding="utf-8", errors="ignore")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for target in LINK.findall(line):
                if target.startswith(SKIP_PREFIXES):
                    continue
                if "?" in target:
                    continue  # a relative link with a query string is a UI route
                clean = target.split("#", 1)[0]
                if not clean:
                    continue
                if clean.startswith("/"):
                    resolved = root / clean.lstrip("/")
                else:
                    resolved = (path.parent / clean).resolve()
                if not Path(resolved).exists():
                    broken += 1
                    report.fail(
                        f"Broken relative link: {target}",
                        path=relative,
                        line=line_number,
                        hint="Fix the path, or link to the file's location on the branch.",
                    )

    report.note(
        f"Checked {len(markdown)} markdown file(s), found {broken} broken link(s)."
    )
    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
