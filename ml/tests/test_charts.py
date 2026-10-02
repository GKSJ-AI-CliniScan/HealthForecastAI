"""Tests for the Milestone 3 evidence charts.

The charts are read by a human, so most of what matters about them cannot be
asserted. What can be: the axis labels are readable rather than raw dataset
codes, a missing artefact fails with a usable message instead of a traceback,
and the files stay under the size the repository will accept.
"""

from pathlib import Path

import pytest

# CI's ML job installs only numpy, pandas, scikit-learn and pyyaml, so
# matplotlib is missing there. Skip these tests instead of breaking the run.
pytest.importorskip("matplotlib")

from src.evaluation import make_m3_charts  # noqa: E402

EVIDENCE = Path(__file__).resolve().parents[2] / "docs" / "06-milestones" / "evidence"
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"

CHART_NAMES = (
    "m3-readmission-by-medication-change.png",
    "m3-readmission-by-a1c-tested.png",
    "m3-top-shap-drivers.png",
    "m3-recovery-by-diagnosis-cohort.png",
)

# 300 KB per chart. Well inside the 5 MB file limit CI enforces, and small
# enough that four of them do not bloat a clone.
MAX_CHART_BYTES = 300 * 1024


@pytest.mark.parametrize(
    "code,expected",
    [("Ch", "Changed"), ("No", "Not changed"), ("tested", "Tested"), ("not tested", "Not tested")],
)
def test_group_codes_become_readable_names(code: str, expected: str) -> None:
    """ "Ch" on a chart axis tells a reader nothing."""
    assert make_m3_charts.group_label(code) == expected


def test_an_unlisted_group_is_title_cased_not_dropped() -> None:
    """A new dataset value must still render, even without an entry in the map."""
    assert make_m3_charts.group_label("steady") == "Steady"


def test_a_missing_artefact_names_the_command_that_builds_it(tmp_path, monkeypatch) -> None:
    """Failing with a traceback would leave the reader guessing."""
    monkeypatch.setattr(make_m3_charts, "ARTIFACTS", tmp_path)
    with pytest.raises(SystemExit, match="treatment_report"):
        make_m3_charts.main()


needs_artifacts = pytest.mark.skipif(
    not (ARTIFACTS / "treatment_metrics.json").exists()
    or not (ARTIFACTS / "feature_importance.json").exists(),
    reason="artefacts not generated - run python -m src.evaluation.treatment_report",
)


@needs_artifacts
def test_charts_render_from_the_artefacts(tmp_path, monkeypatch) -> None:
    """The whole script runs end to end and writes all four files."""
    monkeypatch.setattr(make_m3_charts, "EVIDENCE", tmp_path)
    make_m3_charts.main()
    for name in CHART_NAMES:
        assert (tmp_path / name).exists(), f"{name} was not written"


@needs_artifacts
@pytest.mark.parametrize("name", CHART_NAMES)
def test_the_committed_charts_stay_small(name: str) -> None:
    """These are committed, so their size is a repository concern."""
    path = EVIDENCE / name
    if not path.exists():
        pytest.skip(f"{name} not generated yet")
    assert path.stat().st_size < MAX_CHART_BYTES
