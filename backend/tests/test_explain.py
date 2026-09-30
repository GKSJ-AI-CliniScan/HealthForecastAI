"""Tests for the serving-time explanation.

Two layers. The synthetic tests pin the arithmetic and the handling of partial
input with a hand-built spec, so they run anywhere. The artifact test then checks
the claim that matters against the real trained model - that baseline plus
contributions reproduces the score - and skips when no model is present.
"""

import numpy as np
import pandas as pd
import pytest

from app.services import explain_service, model_service, risk_service


class FakePreprocessor:
    """Stands in for the fitted ColumnTransformer: returns the frame's values as-is."""

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        return frame[["prior", "stay", "snf", "home"]].to_numpy(dtype=float)


SPEC = {
    "kind": "logistic-linear",
    "exact_on_probability": True,
    # two numeric features and a one-hot pair that folds into "discharge"
    "feature_names": ["prior", "stay", "snf", "home"],
    "groups": ["prior", "stay", "discharge", "discharge"],
    "coef": [0.6, 0.05, 0.7, -0.4],
    "means": [0.5, 4.0, 0.2, 0.7],
    "intercept": -2.0,
    "scale": 1.0,
    "offset": 0.0,
}


def frame(prior: float, stay: float, snf: float, home: float) -> pd.DataFrame:
    return pd.DataFrame(
        {"prior": [prior], "stay": [stay], "snf": [snf], "home": [home], "discharge": ["x"]}
    )


def test_baseline_plus_contributions_is_the_log_odds() -> None:
    patient = frame(3, 9, 1, 0)
    baseline, grouped, names = explain_service.contribution_matrix(
        SPEC, FakePreprocessor(), patient
    )

    expected_logit = -2.0 + 0.6 * 3 + 0.05 * 9 + 0.7 * 1 + -0.4 * 0
    assert baseline + grouped.sum() == pytest.approx(expected_logit)
    assert names == ["prior", "stay", "discharge"]


def test_one_hot_columns_fold_into_one_reported_factor() -> None:
    (row,) = explain_service.explain_frame(SPEC, FakePreprocessor(), frame(3, 9, 1, 0))
    reported = [f["feature"] for f in row["up"] + row["down"]]
    assert reported.count("discharge") == 1


def test_a_risky_patient_is_explained_by_the_right_factors_in_order() -> None:
    (row,) = explain_service.explain_frame(SPEC, FakePreprocessor(), frame(4, 12, 1, 0))
    up = [f["feature"] for f in row["up"]]

    assert up[0] == "prior", "four prior admissions is the largest push up"
    assert row["up"][0]["odds_ratio"] > 1
    assert all(f["odds_ratio"] < 1 for f in row["down"])


def test_a_protective_profile_lists_what_is_keeping_risk_down() -> None:
    (row,) = explain_service.explain_frame(SPEC, FakePreprocessor(), frame(0, 1, 0, 1))
    assert any(f["feature"] == "discharge" for f in row["down"])


def test_a_factor_whose_input_was_not_supplied_is_marked_imputed() -> None:
    """An imputed value is not a finding about this patient."""
    (row,) = explain_service.explain_frame(
        SPEC, FakePreprocessor(), frame(4, 12, 1, 0), supplied={"stay"}
    )
    by_name = {f["feature"]: f for f in row["up"] + row["down"]}

    assert by_name["prior"]["imputed"] is True and by_name["prior"]["value"] is None
    assert by_name["stay"]["imputed"] is False and by_name["stay"]["value"] == 12


def test_negligible_effects_are_left_out() -> None:
    at_average = frame(0.5, 4.0, 0.2, 0.7)
    (row,) = explain_service.explain_frame(SPEC, FakePreprocessor(), at_average)
    assert row["up"] == [] and row["down"] == []


def test_the_baseline_probability_is_the_average_patient() -> None:
    (row,) = explain_service.explain_frame(SPEC, FakePreprocessor(), frame(0.5, 4.0, 0.2, 0.7))
    logit = -2.0 + 0.6 * 0.5 + 0.05 * 4.0 + 0.7 * 0.2 + -0.4 * 0.7
    assert row["baseline_probability"] == pytest.approx(1 / (1 + np.exp(-logit)), abs=1e-4)


def test_the_calibration_scale_and_offset_are_applied() -> None:
    """Platt scaling stretches the log-odds; the contributions must stretch with it."""
    scaled = {**SPEC, "scale": 0.5, "offset": -0.3}
    base, plain, _ = explain_service.contribution_matrix(
        SPEC, FakePreprocessor(), frame(3, 9, 1, 0)
    )
    base_s, stretched, _ = explain_service.contribution_matrix(
        scaled, FakePreprocessor(), frame(3, 9, 1, 0)
    )
    np.testing.assert_allclose(stretched, plain * 0.5)

    # baseline = scale * (intercept + coef . means) + offset
    average_logit = -2.0 + 0.6 * 0.5 + 0.05 * 4.0 + 0.7 * 0.2 + -0.4 * 0.7
    assert base == pytest.approx(average_logit)
    assert base_s == pytest.approx(0.5 * average_logit - 0.3)


needs_model = pytest.mark.skipif(
    not model_service.is_loaded() or model_service.load_model().explain_spec is None,
    reason="no trained model with an explanation spec is available",
)


@needs_model
def test_on_the_real_model_the_explanation_matches_the_displayed_score() -> None:
    """Checked against the trained artifact rather than asserted.

    A linear model reproduces the displayed probability exactly (baseline plus
    contributions). A tree model is explained by occlusion, where each factor's
    number is the drop in the displayed score when only that factor is set to its
    typical value - so it is checked against a direct re-score, and the spec must
    admit it is not additive.
    """
    model = model_service.load_model()
    empty = risk_service.build_feature_frame({}, model.feature_columns)[0]
    filled = risk_service.build_feature_frame(
        {"time_in_hospital": 9, "number_inpatient": 3, "num_medications": 22},
        model.feature_columns,
    )[0]
    both = pd.concat([empty, filled], ignore_index=True)
    predict = model.pipeline.predict_proba

    baseline, grouped, names = explain_service.contribution_matrix(
        model.explain_spec, model.preprocessor, both, predict
    )

    if model.explain_spec["kind"] == "occlusion":
        assert model.explain_spec["exact_on_probability"] is False
        assert model.explain_spec["additive"] is False
        column = "number_inpatient"
        altered = both.copy()
        altered[column] = model.explain_spec["reference_values"][column]
        logit = explain_service._logit
        expected = logit(predict(both)[:, 1]) - logit(predict(altered)[:, 1])
        np.testing.assert_allclose(grouped[:, names.index(column)], expected, atol=1e-9)
    else:
        reconstructed = baseline + grouped.sum(axis=1)
        np.testing.assert_allclose(1 / (1 + np.exp(-reconstructed)), predict(both)[:, 1], atol=1e-8)


@needs_model
def test_the_real_model_never_uses_race_or_gender() -> None:
    model = model_service.load_model()
    assert "race" not in model.explain_spec["groups"]
    assert "gender" not in model.explain_spec["groups"]
    assert set(model.excluded_features) >= {"race", "gender"}


@needs_model
def test_a_realtime_prediction_carries_an_explanation() -> None:
    result = risk_service.predict_one(
        {"time_in_hospital": 12, "number_inpatient": 4, "number_emergency": 2}
    )
    explanation = result["explanation"]

    assert explanation is not None
    assert 0.03 < explanation["baseline_probability"] < 0.2
    assert any(f["feature"] == "number_inpatient" for f in explanation["up"])
    # The fields the caller supplied are findings; they must not be marked imputed.
    supplied_factor = next(f for f in explanation["up"] if f["feature"] == "number_inpatient")
    assert supplied_factor["imputed"] is False
    assert supplied_factor["value"] == 4
