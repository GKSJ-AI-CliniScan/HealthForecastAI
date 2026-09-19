"""Draw the Milestone 3 evidence charts from the generated artefacts.

Usage:
    python -m src.evaluation.make_m3_charts

Reads ml/artifacts/treatment_metrics.json and ml/artifacts/feature_importance.json
and writes four PNGs into docs/06-milestones/evidence/. Nothing is recomputed
here - a chart that recalculated its own numbers could disagree with the artefact
the backend reads, which is the one thing these pictures exist to avoid.

Every chart uses one colour for the data and grey for anything the reader should
not trust, with the reason written on the chart as text. Colour never carries
meaning on its own.
"""

from __future__ import annotations

import json
import textwrap
from pathlib import Path
from typing import Any

import matplotlib

# Agg has no display dependency, so this runs the same in CI as it does locally.
matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402 - must follow the backend selection

REPO_ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS = REPO_ROOT / "ml" / "artifacts"
EVIDENCE = REPO_ROOT / "docs" / "06-milestones" / "evidence"

# Chart colours. One series colour, the rest are ink and chrome, so nothing in
# these charts is distinguished by hue alone.
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_SECONDARY = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SERIES = "#2a78d6"

MIN_RELIABLE = 30

# The dataset stores these groups as codes. "Ch" on an axis means nothing to a
# reader, so they are spelled out here; anything not listed is title-cased.
GROUP_NAMES = {
    "Ch": "Changed",
    "No": "Not changed",
    "tested": "Tested",
    "not tested": "Not tested",
}


def group_label(value: str) -> str:
    """Return the readable name for a group code."""
    return GROUP_NAMES.get(value, value[:1].upper() + value[1:])


def add_titles(ax: Any, title: str, subtitle: str) -> None:
    """Place the title and the caption above the plot without letting them touch.

    Both are anchored to the axes rather than the figure. Anchoring the caption
    to the figure put it at a fixed height that landed on top of the title once
    the chart changed size, which is what the first version of this file did.
    The caption is wrapped by hand because matplotlib does not wrap text.
    """
    wrapped = textwrap.fill(subtitle, width=94)
    lines = wrapped.count("\n") + 1
    ax.set_title(title, loc="left", color=INK, fontsize=11, pad=12 + 11 * lines)
    ax.text(
        0,
        1.0,
        wrapped,
        transform=ax.transAxes,
        va="bottom",
        ha="left",
        color=INK_SECONDARY,
        fontsize=8.5,
        linespacing=1.4,
    )


def style_axes(ax: Any, xlabel: str) -> None:
    """Apply the shared chart chrome: hairline grid, no box, recessive axes.

    Pulled out so all four charts read as one set rather than four separate
    attempts, and so the styling is in one place if it needs changing.
    """
    ax.set_facecolor(SURFACE)
    ax.set_xlabel(xlabel, color=INK_SECONDARY, fontsize=9)
    ax.xaxis.grid(True, color=GRID, linewidth=0.8)
    ax.yaxis.grid(False)
    ax.set_axisbelow(True)
    for side in ("top", "right", "bottom"):
        ax.spines[side].set_visible(False)
    ax.spines["left"].set_color(AXIS)
    ax.spines["left"].set_linewidth(0.8)
    ax.tick_params(colors=MUTED, labelsize=9, length=0)
    for label in ax.get_yticklabels():
        label.set_color(INK)


def save(figure: Any, name: str) -> Path:
    """Write one chart and report its size, which has to stay under 300 KB."""
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    path = EVIDENCE / name
    figure.savefig(path, dpi=140, facecolor=SURFACE, bbox_inches="tight")
    plt.close(figure)
    print(f"  {name}  {path.stat().st_size / 1024:.0f} KB")
    return path


def rate_with_interval(entry: dict[str, Any], title: str, subtitle: str, name: str) -> None:
    """Draw one treatment factor as a point estimate with its 95% interval.

    A dot and whisker rather than a bar: the interval is the point of these two
    charts, and a bar would draw the eye to a length measured from zero while
    hiding the uncertainty that decides whether the gap means anything.
    """
    groups = sorted(entry["groups"], key=lambda group: group["rate_30d"])
    figure, ax = plt.subplots(figsize=(7.2, 2.2))
    positions = range(len(groups))

    for position, group in zip(positions, groups, strict=False):
        low, high = group["ci_95_30d"]
        colour = SERIES if group["reliable"] else MUTED
        ax.plot(
            [low, high], [position, position], color=colour, linewidth=2, solid_capstyle="round"
        )
        ax.plot(group["rate_30d"], position, "o", color=colour, markersize=9, zorder=3)
        # The value sits to the right of the interval so it never lands on the mark.
        ax.text(
            high + 0.0012,
            position,
            f"{group['rate_30d'] * 100:.2f}%  (n={group['n']:,})",
            va="center",
            fontsize=9,
            color=INK,
        )

    ax.set_yticks(list(positions))
    ax.set_yticklabels([group_label(group["value"]) for group in groups])
    ax.set_ylim(-0.5, len(groups) - 0.5)
    style_axes(ax, "30-day readmission rate (bar shows the 95% confidence interval)")
    ax.xaxis.set_major_formatter(lambda value, _: f"{value * 100:.1f}%")
    ax.set_xlim(left=min(g["ci_95_30d"][0] for g in groups) - 0.004)

    add_titles(ax, title, subtitle)
    save(figure, name)


def shap_drivers(importance: dict[str, Any], name: str) -> None:
    """Draw the top global risk drivers as a ranked horizontal bar chart."""
    drivers = importance["global_drivers"][:10][::-1]
    figure, ax = plt.subplots(figsize=(7.6, 4.2))
    positions = range(len(drivers))
    values = [driver["mean_abs_shap"] for driver in drivers]

    ax.barh(list(positions), values, color=SERIES, height=0.62)
    for position, driver in zip(positions, drivers, strict=False):
        ax.text(
            driver["mean_abs_shap"] + max(values) * 0.015,
            position,
            f"{driver['mean_abs_shap']:.3f}",
            va="center",
            fontsize=8.5,
            color=INK_SECONDARY,
        )

    ax.set_yticks(list(positions))
    ax.set_yticklabels([driver["label"] for driver in drivers])
    style_axes(ax, "mean absolute SHAP value (uncalibrated model margin)")
    ax.set_xlim(0, max(values) * 1.18)

    rows = importance["sample"]["rows_explained"]
    add_titles(
        ax,
        "What drives predicted readmission risk",
        f"SHAP TreeExplainer over {rows:,} held-out patients. Association, not cause.",
    )
    save(figure, name)


def recovery_by_cohort(treatment: dict[str, Any], name: str) -> None:
    """Draw mean recovery score per primary-diagnosis cohort.

    Cohorts under the reliability threshold are drawn grey and say why in words
    next to the bar, so a reader never has to know what the colour means.
    """
    cohorts = sorted(
        [
            row
            for row in treatment["cohorts"]["diagnosis"]
            if row["mean_recovery_score"] is not None
        ],
        key=lambda row: row["mean_recovery_score"],
    )
    figure, ax = plt.subplots(figsize=(7.6, 4.4))
    positions = range(len(cohorts))

    for position, row in zip(positions, cohorts, strict=False):
        colour = SERIES if row["reliable"] else MUTED
        ax.barh(position, row["mean_recovery_score"], color=colour, height=0.62)
        note = "" if row["reliable"] else f"  n={row['n']} - too few to rely on"
        ax.text(
            row["mean_recovery_score"] + 0.6,
            position,
            f"{row['mean_recovery_score']:.1f}{note}",
            va="center",
            fontsize=8.5,
            color=INK_SECONDARY if row["reliable"] else MUTED,
        )

    ax.set_yticks(list(positions))
    ax.set_yticklabels([row["cohort"] for row in cohorts])
    style_axes(ax, "mean recovery score (0-100, higher is better)")
    ax.set_xlim(0, 100)

    add_titles(
        ax,
        "Recovery score by primary diagnosis",
        f"{treatment['population']['rows']:,} patients. Grey bars fall under the "
        f"{MIN_RELIABLE}-patient reliability threshold.",
    )
    save(figure, name)


def main() -> None:
    """Draw all four evidence charts."""
    treatment_path = ARTIFACTS / "treatment_metrics.json"
    importance_path = ARTIFACTS / "feature_importance.json"
    for path in (treatment_path, importance_path):
        if not path.exists():
            raise SystemExit(
                f"{path.name} is missing. Run python -m src.evaluation.treatment_report first."
            )

    treatment = json.loads(treatment_path.read_text(encoding="utf-8"))
    importance = json.loads(importance_path.read_text(encoding="utf-8"))
    factors = treatment["treatment_effectiveness"]["factors"]

    print("Writing charts to docs/06-milestones/evidence/")
    rate_with_interval(
        factors["change"],
        "Readmission by whether medication was changed",
        f"{treatment['population']['rows']:,} patients. "
        f"chi-square p = {factors['change']['chi_square_30d']['p_value']}. "
        "Medication is changed for sicker patients - this is not an effect.",
        "m3-readmission-by-medication-change.png",
    )
    rate_with_interval(
        factors["a1c_tested"],
        "Readmission by whether HbA1c was tested",
        "No before/after HbA1c exists in this dataset, so this is testing vs not "
        "testing - not a measured improvement.",
        "m3-readmission-by-a1c-tested.png",
    )
    shap_drivers(importance, "m3-top-shap-drivers.png")
    recovery_by_cohort(treatment, "m3-recovery-by-diagnosis-cohort.png")


if __name__ == "__main__":
    main()
