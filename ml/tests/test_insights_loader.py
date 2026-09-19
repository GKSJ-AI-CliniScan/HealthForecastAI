"""Tests for the backend-facing loader and the shape of the two artefacts.

The artefact tests run against the real generated files and skip when they are
absent, since the dataset they are built from is not committed. The loader tests
build their own files in a temp directory so they run either way.
"""

import json
from pathlib import Path

import pytest

from src.serving import insights_loader

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"

COHORT_TYPES = ("age", "gender", "race", "diagnosis")
GROUP_FIELDS = {
    "value",
    "n",
    "readmitted_30d",
    "rate_30d",
    "ci_95_30d",
    "readmitted_any",
    "rate_any",
    "ci_95_any",
    "reliable",
}


@pytest.fixture(autouse=True)
def clear_cache():
    """Each test starts from an empty cache so one test's file cannot leak into another."""
    insights_loader.reset_cache()
    yield
    insights_loader.reset_cache()


def _write(directory: Path, importance: dict | None = None, treatment: dict | None = None) -> None:
    """Write a minimal pair of artefacts into a directory."""
    (directory / "feature_importance.json").write_text(
        json.dumps(
            importance
            if importance is not None
            else {
                "schema_version": "1.0",
                "global_drivers": [
                    {"feature": f"f{i}", "label": f"F {i}", "rank": i} for i in range(1, 13)
                ],
                "patient_drivers": {"111": [{"feature": f"f{i}", "rank": i} for i in range(1, 8)]},
            }
        ),
        encoding="utf-8",
    )
    (directory / "treatment_metrics.json").write_text(
        json.dumps(
            treatment
            if treatment is not None
            else {
                "schema_version": "1.0",
                "generated_at": "2026-09-19T00:00:00+00:00",
                "population": {"rows": 1},
                "recovery_score": {"mean": 70.0},
                "treatment_effectiveness": {"factors": {}, "medications": {}},
                "cohorts": {name: [{"cohort": "x", "n": 1}] for name in COHORT_TYPES},
                "model_evaluation": {"roc_auc": 0.65},
                "limitations": ["associations only"],
            }
        ),
        encoding="utf-8",
    )


@pytest.fixture
def loaded(tmp_path, monkeypatch):
    """Point the loader at a temp directory holding a valid pair of artefacts."""
    _write(tmp_path)
    monkeypatch.setattr(insights_loader, "ARTIFACTS_DIR", tmp_path)
    return tmp_path


def test_global_drivers_respect_top_n(loaded) -> None:
    """The default is 10 and the argument narrows it further."""
    assert len(insights_loader.get_global_drivers()) == 10
    assert len(insights_loader.get_global_drivers(top_n=3)) == 3


def test_patient_drivers_are_trimmed_to_top_n(loaded) -> None:
    """The file holds more than five; the caller gets five."""
    assert len(insights_loader.get_patient_drivers("111")) == 5


def test_a_patient_outside_the_sample_returns_none(loaded) -> None:
    """None, not an exception - most encounters are not in the sample."""
    assert insights_loader.get_patient_drivers("not-a-patient") is None


def test_an_integer_encounter_id_works_like_the_string(loaded) -> None:
    """JSON keys are strings; the backend holds an integer id."""
    assert insights_loader.get_patient_drivers(111) == insights_loader.get_patient_drivers("111")


def test_treatment_summary_carries_the_limitations(loaded) -> None:
    """The caveats travel with the numbers so an endpoint cannot drop them."""
    summary = insights_loader.get_treatment_summary()
    assert summary["limitations"] == ["associations only"]
    assert summary["schema_version"] == "1.0"


@pytest.mark.parametrize("cohort_type", COHORT_TYPES)
def test_every_cohort_type_loads(loaded, cohort_type: str) -> None:
    """All four types the contract names are readable."""
    assert insights_loader.get_cohort_metrics(cohort_type)


def test_an_unknown_cohort_type_names_the_valid_ones(loaded) -> None:
    """The error has to be actionable, not just a KeyError."""
    with pytest.raises(ValueError, match="Unknown cohort type"):
        insights_loader.get_cohort_metrics("diagnosis_group")


def test_a_schema_mismatch_raises_rather_than_returning_data(tmp_path, monkeypatch) -> None:
    """A future artefact must not be read as if it were v1.0."""
    _write(tmp_path, importance={"schema_version": "2.0", "global_drivers": []})
    monkeypatch.setattr(insights_loader, "ARTIFACTS_DIR", tmp_path)
    with pytest.raises(insights_loader.SchemaVersionError, match="2.0"):
        insights_loader.get_global_drivers()


def test_a_missing_artefact_says_how_to_generate_it(tmp_path, monkeypatch) -> None:
    """The message names the command, so the reader is not left guessing."""
    monkeypatch.setattr(insights_loader, "ARTIFACTS_DIR", tmp_path)
    with pytest.raises(insights_loader.InsightsUnavailableError, match="treatment_report"):
        insights_loader.get_treatment_summary()


def test_the_artefact_is_read_from_disk_only_once(loaded, monkeypatch) -> None:
    """Counts real reads rather than asserting the design intent."""
    reads = []
    original = Path.read_text

    def counting_read(self, *args, **kwargs):
        reads.append(self.name)
        return original(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", counting_read)
    insights_loader.get_global_drivers()
    insights_loader.get_global_drivers()
    insights_loader.get_patient_drivers("111")
    assert reads.count("feature_importance.json") == 1


# The tests below check the real generated artefacts. They are skipped rather
# than failed when the files are absent, because generating them needs the raw
# dataset, which is never committed.
needs_artifacts = pytest.mark.skipif(
    not (ARTIFACTS / "treatment_metrics.json").exists()
    or not (ARTIFACTS / "feature_importance.json").exists(),
    reason="artefacts not generated - run python -m src.evaluation.treatment_report",
)


@pytest.fixture
def real_treatment() -> dict:
    """The generated treatment_metrics.json."""
    return json.loads((ARTIFACTS / "treatment_metrics.json").read_text(encoding="utf-8"))


@pytest.fixture
def real_importance() -> dict:
    """The generated feature_importance.json."""
    return json.loads((ARTIFACTS / "feature_importance.json").read_text(encoding="utf-8"))


@needs_artifacts
def test_treatment_metrics_has_the_contracted_top_level_shape(real_treatment: dict) -> None:
    """Every key docs/ml-insights-contract.md promises is present."""
    expected = {
        "schema_version",
        "generated_at",
        "population",
        "recovery_score",
        "treatment_effectiveness",
        "cohorts",
        "model_evaluation",
        "limitations",
    }
    assert expected.issubset(set(real_treatment))
    assert real_treatment["schema_version"] == "1.0"


@needs_artifacts
def test_every_group_entry_has_every_contracted_field(real_treatment: dict) -> None:
    """One missing field would break the backend on a drug nobody checked by hand."""
    factors = real_treatment["treatment_effectiveness"]["factors"]
    medications = real_treatment["treatment_effectiveness"]["medications"]
    for entry in list(factors.values()) + list(medications.values()):
        assert "chi_square_30d" in entry
        for group in entry["groups"]:
            assert GROUP_FIELDS.issubset(set(group))


@needs_artifacts
def test_rates_sit_inside_their_confidence_intervals(real_treatment: dict) -> None:
    """A rate outside its own interval would mean the interval maths is wrong."""
    for entry in real_treatment["treatment_effectiveness"]["factors"].values():
        for group in entry["groups"]:
            low, high = group["ci_95_30d"]
            assert low <= group["rate_30d"] <= high


@needs_artifacts
def test_all_four_cohort_types_are_present_and_flagged(real_treatment: dict) -> None:
    """Small cohorts exist in the output and are marked, not removed."""
    cohorts = real_treatment["cohorts"]
    assert set(COHORT_TYPES) == set(cohorts)
    for rows in cohorts.values():
        for row in rows:
            assert row["reliable"] == (row["n"] >= 30)


@needs_artifacts
def test_the_nine_named_diagnosis_groups_are_covered(real_treatment: dict) -> None:
    """The milestone names nine groups; the data should reach all of them."""
    named = {
        "circulatory",
        "respiratory",
        "digestive",
        "diabetes",
        "injury",
        "musculoskeletal",
        "genitourinary",
        "neoplasms",
        "other",
    }
    found = {row["cohort"] for row in real_treatment["cohorts"]["diagnosis"]}
    assert named.issubset(found)


@needs_artifacts
def test_feature_importance_has_the_contracted_shape(real_importance: dict) -> None:
    """Schema version, method and the driver fields the contract promises."""
    assert real_importance["schema_version"] == "1.0"
    assert real_importance["method"] in {"shap_tree_explainer", "xgboost_feature_importances"}
    for driver in real_importance["global_drivers"]:
        assert {"feature", "label", "mean_abs_shap", "direction", "rank"}.issubset(set(driver))
        assert driver["label"] != driver["feature"]


@needs_artifacts
def test_patient_drivers_are_capped_at_five(real_importance: dict) -> None:
    """The contract promises top 5 per patient."""
    for drivers in real_importance["patient_drivers"].values():
        assert len(drivers) <= 5


@needs_artifacts
def test_both_artefacts_stay_well_under_the_five_megabyte_limit() -> None:
    """CI rejects a file over 5 MB, and these are committed."""
    for name in ("treatment_metrics.json", "feature_importance.json"):
        assert (ARTIFACTS / name).stat().st_size < 2 * 1024 * 1024
