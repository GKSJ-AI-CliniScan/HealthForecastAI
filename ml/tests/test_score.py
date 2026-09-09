"""Tests for batch model scoring."""

import pandas as pd

from src.models.score import prepare_for_inference


def test_prepare_for_inference_adds_engineered_features() -> None:
    frame = pd.DataFrame(
        {
            "number_outpatient": [1, 2],
            "number_emergency": [2, 1],
            "number_inpatient": [3, 4],
            "age": ["[50-60)", "[60-70)"],
        }
    )

    config = {
        "preprocessing": {
            "drop_columns": [],
        }
    }

    result = prepare_for_inference(frame, config)

    assert "prior_visits_total" in result.columns

    assert result["prior_visits_total"].tolist() == [
        6,
        7,
    ]
