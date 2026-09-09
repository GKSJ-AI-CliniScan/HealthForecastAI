"""Tests for readmission model inference."""

import pandas as pd
import pytest
import numpy as np

from src.models.predict import categorise_risk, predict_frame


class DummyModel:
    """Small fake model for inference tests."""

    def predict_proba(self, frame: pd.DataFrame):
        probabilities = [0.10, 0.45, 0.80]

        return np.array(
            [[1.0 - probability, probability] for probability in probabilities[: len(frame)]]
        )


def test_predict_frame_adds_probability_and_risk() -> None:
    frame = pd.DataFrame(
        {
            "feature_a": [1, 2, 3],
        }
    )

    result = predict_frame(
        model=DummyModel(),
        frame=frame,
    )

    assert "readmission_probability" in result.columns
    assert "risk_category" in result.columns

    assert result["readmission_probability"].tolist() == [
        0.10,
        0.45,
        0.80,
    ]

    assert result["risk_category"].tolist() == [
        "low",
        "medium",
        "high",
    ]


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.0, "low"),
        (0.39, "low"),
        (0.40, "medium"),
        (0.69, "medium"),
        (0.70, "high"),
        (1.0, "high"),
    ],
)
def test_categorise_risk(
    probability: float,
    expected: str,
) -> None:
    assert categorise_risk(probability) == expected


@pytest.mark.parametrize(
    "probability",
    [-0.1, 1.1],
)
def test_categorise_risk_rejects_invalid_probability(
    probability: float,
) -> None:
    with pytest.raises(ValueError):
        categorise_risk(probability)
