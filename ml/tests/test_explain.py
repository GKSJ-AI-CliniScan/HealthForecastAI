"""Tests for the risk driver extraction.

The sparse-input test is the important one. The first version of explain.py
densified the transformed matrix before handing it to SHAP, which silently
changed the function being explained and reversed the reported direction of
number_inpatient. Nothing else in the suite would have caught that, because the
SHAP values were internally consistent - they just described a different model.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from sklearn.dummy import DummyClassifier
from sklearn.pipeline import Pipeline

from src.features.build_features import build_preprocessor
from src.models.explain import (
    additivity_error,
    aggregate_by_source,
    label_for,
    source_columns,
    unwrap_pipeline,
)

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


def _fitted_preprocessor() -> Pipeline:
    """A small preprocessor fitted on columns whose names overlap on purpose.

    diag_1 and diag_1_group share a prefix, which is exactly the case a naive
    startswith match gets wrong.
    """
    frame = pd.DataFrame(
        {
            "time_in_hospital": [1, 2, 3, 4],
            "diag_1": ["428", "250.83", "428", "V57"],
            "diag_1_group": ["Circulatory", "Diabetes", "Circulatory", "Other"],
        }
    )
    preprocessor = build_preprocessor(frame, {"preprocessing": {}})
    preprocessor.fit(frame)
    return preprocessor


def test_source_columns_prefers_the_longer_name() -> None:
    """diag_1_group categories must not be credited to diag_1."""
    preprocessor = _fitted_preprocessor()
    mapping = dict(
        zip(preprocessor.get_feature_names_out(), source_columns(preprocessor), strict=False)
    )
    for name, source in mapping.items():
        if "diag_1_group" in name:
            assert source == "diag_1_group"


def test_every_transformed_column_maps_to_exactly_one_input() -> None:
    """No column may be left unattributed, or its contribution silently vanishes."""
    preprocessor = _fitted_preprocessor()
    sources = source_columns(preprocessor)
    assert len(sources) == len(preprocessor.get_feature_names_out())
    assert set(sources) <= set(preprocessor.feature_names_in_)


def test_aggregate_by_source_sums_a_columns_one_hot_block() -> None:
    """A row's one-hot block has one active category, so the block's sum is its total."""
    values = np.array([[1.0, 2.0, 3.0], [0.5, 0.5, -1.0]])
    result = aggregate_by_source(values, ["a", "a", "b"], ["a", "b"])
    assert result["a"].tolist() == [3.0, 1.0]
    assert result["b"].tolist() == [3.0, -1.0]


def test_aggregate_by_source_returns_the_input_column_order() -> None:
    """Callers index this frame by model input name, so the order has to be theirs."""
    values = np.array([[1.0, 2.0]])
    result = aggregate_by_source(values, ["b", "a"], ["a", "b"])
    assert list(result.columns) == ["a", "b"]


def test_a_column_with_no_transformed_output_is_zero_not_missing() -> None:
    """A dropped column contributes nothing rather than raising a KeyError."""
    result = aggregate_by_source(np.array([[1.0]]), ["a"], ["a", "unused"])
    assert result["unused"].tolist() == [0.0]


def test_unwrap_returns_a_bare_pipeline_unchanged() -> None:
    """An older artefact saved as a plain Pipeline still works."""
    pipeline = Pipeline([("model", DummyClassifier())])
    assert unwrap_pipeline(pipeline) is pipeline


def test_unwrap_digs_through_the_calibrated_wrapper() -> None:
    """train.py saves CalibratedClassifierCV(FrozenEstimator(Pipeline))."""
    pipeline = Pipeline([("model", DummyClassifier())])

    class Frozen:
        estimator = pipeline

    class Inner:
        estimator = Frozen()

    class Calibrated:
        calibrated_classifiers_ = [Inner()]

    assert unwrap_pipeline(Calibrated()) is pipeline


def test_unwrap_raises_on_something_that_holds_no_pipeline() -> None:
    """A clear error beats an AttributeError three frames deep."""
    with pytest.raises(TypeError, match="No fitted Pipeline"):
        unwrap_pipeline(DummyClassifier())


def test_labels_are_readable_and_fall_back_to_the_column_name() -> None:
    """A label is what a clinician reads, so it must not be a column name."""
    assert label_for("number_inpatient") == "Previous inpatient visits"
    assert label_for("A1Cresult") == "HbA1c test result"
    assert label_for("not_a_real_column") == "not_a_real_column"


def test_additivity_error_is_zero_for_a_perfect_reconstruction() -> None:
    """The check itself has to be right before it can police anything."""

    class Stub:
        def predict(self, matrix, output_margin=False):
            return np.array([2.0, 3.0])

    values = np.array([[0.5, 0.5], [1.0, 1.0]])
    assert additivity_error(Stub(), None, values, 1.0) == pytest.approx(0.0)


# The tests below need the generated artefact and the trained model.
needs_model = pytest.mark.skipif(
    not (ARTIFACTS / "readmission_model.joblib").exists(),
    reason="no trained model on disk",
)
needs_importance = pytest.mark.skipif(
    not (ARTIFACTS / "feature_importance.json").exists(),
    reason="artefact not generated - run python -m src.evaluation.treatment_report",
)


@needs_model
def test_densifying_the_matrix_changes_what_the_model_predicts() -> None:
    """This is the bug the first version of explain.py walked into.

    XGBoost reads an absent entry in a sparse matrix as missing and takes the
    tree's default branch; .toarray() makes it an explicit 0.0 that takes the
    numeric branch. The two are different functions, so SHAP run on the dense
    copy explains a model that was never trained. The test asserts the gap is
    real, so nobody 'tidies up' explain.py by densifying again.
    """
    import joblib
    from scipy.sparse import issparse

    from src.data.load_data import load_raw
    from src.data.preprocess import basic_clean
    from src.features.build_features import build_features
    from src.utils.config import load_config

    config = load_config()
    raw_path = Path(__file__).resolve().parents[2] / config["dataset"]["raw_path"]
    if not raw_path.exists():
        pytest.skip("raw dataset not present")

    frame = build_features(basic_clean(load_raw(raw_path).head(3000), config))
    features = frame.drop(columns=[c for c in ("readmitted", "patient_nbr") if c in frame.columns])
    pipeline = unwrap_pipeline(joblib.load(ARTIFACTS / "readmission_model.joblib"))

    # drop_constant_columns removes any drug that happens to be "No" for every
    # row of this 3000-row slice, so those columns are put back as "No" - which
    # is what they mean - and the frame is ordered as the preprocessor expects.
    expected = list(pipeline.named_steps["preprocess"].feature_names_in_)
    for column in expected:
        if column not in features.columns:
            features[column] = "No"
    transformed = pipeline.named_steps["preprocess"].transform(features[expected].head(200))
    assert issparse(transformed), "the preprocessor is expected to return a sparse matrix"

    model = pipeline.named_steps["model"]
    sparse_probability = model.predict_proba(transformed)[:, 1]
    dense_probability = model.predict_proba(transformed.toarray())[:, 1]
    assert np.abs(sparse_probability - dense_probability).max() > 0.01


@needs_importance
def test_the_exported_explanation_reconstructs_the_model() -> None:
    """A large additivity error means the explanation does not match the model."""
    data = json.loads((ARTIFACTS / "feature_importance.json").read_text(encoding="utf-8"))
    if data["method"] != "shap_tree_explainer":
        pytest.skip("fallback method records no additivity check")
    assert data["additivity_max_error"] < 1e-4


@needs_importance
def test_prior_inpatient_visits_are_reported_as_raising_risk() -> None:
    """The observed 30-day rate climbs from 0.08 at zero prior admissions to 0.33.

    A model or an explanation that says otherwise is wrong, and this is the exact
    value that came out backwards while explain.py was densifying the matrix.
    """
    data = json.loads((ARTIFACTS / "feature_importance.json").read_text(encoding="utf-8"))
    drivers = {driver["feature"]: driver for driver in data["global_drivers"]}
    if "number_inpatient" not in drivers:
        pytest.skip("number_inpatient did not rank in the exported drivers")
    assert drivers["number_inpatient"]["direction"] == "higher_value_increases_risk"
