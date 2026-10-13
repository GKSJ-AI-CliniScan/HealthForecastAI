"""Tests for the risk intelligence layer."""

import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression

from src.models.risk_intelligence import (
    RECOMMENDATIONS,
    assign_risk_levels,
    predict_risk,
)


@pytest.fixture()
def bundle_and_features():
    rng = np.random.default_rng(42)
    features = pd.DataFrame({"a": rng.normal(size=200), "b": rng.normal(size=200)})
    target = (features["a"] + rng.normal(scale=0.5, size=200) > 0).astype(int)
    model = LogisticRegression().fit(features, target)
    bundle = {"pipeline": model, "decision_threshold": 0.3}
    return bundle, features


def test_assign_risk_levels_uses_cut_points():
    scores = np.array([0.05, 0.30, 0.55, 0.90])
    levels = assign_risk_levels(scores, medium_cut=0.3, high_cut=0.6)
    assert list(levels) == ["Low", "Medium", "Medium", "High"]


def test_assign_risk_levels_rejects_bad_cut_points():
    with pytest.raises(ValueError):
        assign_risk_levels(np.array([0.5]), medium_cut=0.6, high_cut=0.4)


def test_predict_risk_output_is_complete_and_valid(bundle_and_features):
    bundle, features = bundle_and_features
    result = predict_risk(features, bundle, high_cut=0.7)

    assert len(result) == len(features)
    assert result["risk_score"].between(0, 1).all()
    assert set(result["risk_level"]).issubset({"Low", "Medium", "High"})
    assert result["clinical_recommendation"].notna().all()


def test_recommendation_matches_risk_level(bundle_and_features):
    bundle, features = bundle_and_features
    result = predict_risk(features, bundle, high_cut=0.7)

    for level, text in zip(result["risk_level"], result["clinical_recommendation"]):
        assert text == RECOMMENDATIONS[level]


def test_higher_scores_never_get_lower_levels(bundle_and_features):
    bundle, features = bundle_and_features
    result = predict_risk(features, bundle, high_cut=0.7).sort_values("risk_score")
    order = {"Low": 0, "Medium": 1, "High": 2}
    ranks = result["risk_level"].map(order).to_numpy()
    assert (np.diff(ranks) >= 0).all()
