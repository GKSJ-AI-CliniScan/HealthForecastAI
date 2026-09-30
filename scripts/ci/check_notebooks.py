"""Reject Jupyter notebooks that still carry saved outputs.

Outputs bloat the repository, produce unreadable diffs, and can embed rows of
patient data straight into git history.

Usage: python scripts/ci/check_notebooks.py
"""

from __future__ import annotations

import json
import sys

from _report import Report
from _walk import rel, tracked_files

MAX_OUTPUT_CHARS = 2000


def main() -> int:
    """Run the notebook hygiene check."""
    report = Report("Notebook hygiene")
    notebooks = [p for p in tracked_files() if p.is_file() and p.suffix == ".ipynb"]

    if not notebooks:
        report.note("No notebooks committed yet.")
        return report.finish()

    for path in notebooks:
        relative = rel(path)
        try:
            document = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
        except (OSError, json.JSONDecodeError) as exc:
            report.fail(f"Notebook is not valid JSON: {exc}", path=relative,
                        hint="Re-save it from Jupyter, or restore the previous version.")
            continue

        cells = document.get("cells", [])
        with_output = 0
        total_output_chars = 0
        for cell in cells:
            outputs = cell.get("outputs") or []
            if outputs:
                with_output += 1
                total_output_chars += len(json.dumps(outputs))

        if with_output:
            report.fail(
                f"{with_output} of {len(cells)} cells still contain saved output "
                f"({total_output_chars} characters)",
                path=relative,
                hint="Run: nbstripout " + relative + "  (see ml/notebooks/README.md)",
            )

        if not cells:
            report.warn("Notebook has no cells", path=relative)

    report.note(f"Checked {len(notebooks)} notebook(s).")
    return report.finish()


if __name__ == "__main__":
    sys.exit(main())
