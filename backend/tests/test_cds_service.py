"""Tests for cds_service (N6): feature importance -> plain, association-only
clinical language, and its wiring into POST /risk/predict.
"""

from __future__ import annotations

import random
import re
from pathlib import Path

import joblib
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from app.core.config import settings
from app.core.rbac import Role
from app.models.patient import Patient
from app.services import cds_service, model_service

# Every causal verb the association language must never use (N6: "the
# language of association, never causation").
_CAUSAL_VERBS = re.compile(r"\b(causes?|caused|leads? to|led to|results? in|drives?)\b", re.I)

REQUEST_NUMERIC = (
    "time_in_hospital",
    "num_medications",
    "num_lab_procedures",
    "number_diagnoses",
    "number_inpatient",
    "number_emergency",
)


@pytest.fixture(autouse=True)
def _reset_model_cache():
    model_service.reset_cache()
    yield
    model_service.reset_cache()


def _train_request_shaped_pipeline() -> Pipeline:
    """A real, fitted pipeline trained only on model_service.REQUEST_FEATURES.

    number_inpatient is built to be the *only* column correlated with the
    target - every other column is independent random noise - so a random
    forest has no way to prefer any other feature. Earlier drafts cycled
    every column through the same four-row pattern, which accidentally made
    them all equally predictive of each other and of the target; this
    version's noise columns are drawn independently per row precisely to
    rule that out.
    """
    rng = random.Random(0)
    rows = 80
    number_inpatient = [0, 0, 0, 3, 3, 3] * (rows // 6 + 1)
    number_inpatient = number_inpatient[:rows]
    frame = pd.DataFrame(
        {
            "time_in_hospital": [rng.randint(1, 14) for _ in range(rows)],
            "num_medications": [rng.randint(1, 20) for _ in range(rows)],
            "num_lab_procedures": [rng.randint(1, 60) for _ in range(rows)],
            "number_diagnoses": [rng.randint(1, 16) for _ in range(rows)],
            "number_inpatient": number_inpatient,
            "number_emergency": [rng.randint(0, 3) for _ in range(rows)],
            "age_group": [rng.choice(["<30", "30-60", "60+"]) for _ in range(rows)],
        }
    )
    target = (frame["number_inpatient"] >= 3).astype(int)

    preprocess = ColumnTransformer(
        transformers=[
            ("numeric", SimpleImputer(strategy="median"), list(REQUEST_NUMERIC)),
            (
                "categorical",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("encode", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                ["age_group"],
            ),
        ]
    )
    pipeline = Pipeline(
        [
            ("preprocess", preprocess),
            ("model", RandomForestClassifier(n_estimators=20, random_state=0)),
        ]
    )
    pipeline.fit(frame, target)
    return pipeline


def _load_pipeline_into_cache(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    joblib.dump(_train_request_shaped_pipeline(), tmp_path / model_service.MODEL_FILENAME)


# --- service-level ------------------------------------------------------------


def test_insights_are_ranked_by_importance_and_number_inpatient_leads(
    tmp_path: Path, monkeypatch
) -> None:
    """number_inpatient drives the synthetic target, so it must rank first,
    and the full list must match the model's own importance ordering -
    not just have the right item in front.
    """
    _load_pipeline_into_cache(tmp_path, monkeypatch)
    features = {
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 35,
        "number_diagnoses": 9,
        "number_inpatient": 3,
        "number_emergency": 1,
        "age_group": "60+",
    }
    insights = cds_service.generate_insights(features, top_n=len(REQUEST_NUMERIC) + 1)
    assert len(insights) > 0
    assert insights[0]["feature"] == "number_inpatient"

    pipeline = model_service.loaded_pipeline()
    importance_by_column = cds_service._aggregate_importance_by_column(pipeline)
    reported_order = [item["feature"] for item in insights]
    expected_order = sorted(
        reported_order, key=lambda feature: importance_by_column[feature], reverse=True
    )
    assert reported_order == expected_order


def test_insights_never_use_a_causal_verb(tmp_path: Path, monkeypatch) -> None:
    """Association language only - the exact discipline N6 requires."""
    _load_pipeline_into_cache(tmp_path, monkeypatch)
    features = {
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 35,
        "number_diagnoses": 9,
        "number_inpatient": 3,
        "number_emergency": 1,
        "age_group": "60+",
    }
    insights = cds_service.generate_insights(features)
    assert insights
    for item in insights:
        assert "associated with" in item["association"]
        assert not _CAUSAL_VERBS.search(item["association"]), item["association"]


def test_insights_only_cover_fields_the_caller_actually_supplied(
    tmp_path: Path, monkeypatch
) -> None:
    """A field the caller left out (None) must never be explained as if observed."""
    _load_pipeline_into_cache(tmp_path, monkeypatch)
    features = {
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 35,
        "number_diagnoses": 9,
        "number_inpatient": None,  # not supplied this time
        "number_emergency": 1,
        "age_group": "60+",
    }
    insights = cds_service.generate_insights(features)
    reported = {item["feature"] for item in insights}
    assert "number_inpatient" not in reported


def test_insights_respect_top_n(tmp_path: Path, monkeypatch) -> None:
    """top_n actually bounds the payload length."""
    _load_pipeline_into_cache(tmp_path, monkeypatch)
    features = {
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 35,
        "number_diagnoses": 9,
        "number_inpatient": 3,
        "number_emergency": 1,
        "age_group": "60+",
    }
    assert len(cds_service.generate_insights(features, top_n=2)) <= 2


def test_insights_raise_when_no_model_is_available(tmp_path: Path, monkeypatch) -> None:
    """No artefact means no insights - the same ModelUnavailableError predict_probability raises."""
    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    with pytest.raises(model_service.ModelUnavailableError):
        cds_service.generate_insights({"time_in_hospital": 3})


def test_insights_are_empty_not_an_error_for_a_model_with_no_importance_mechanism(
    tmp_path: Path, monkeypatch
) -> None:
    """KNeighborsClassifier has neither feature_importances_ nor coef_ - a
    real model type, not a stub - so insights must degrade to an empty list,
    never raise. The prediction itself still works for this model type;
    only the secondary insights enrichment is unavailable.
    """
    frame = pd.DataFrame(
        {
            "time_in_hospital": [1, 5, 3, 8, 2, 6, 4, 7],
            "num_medications": [2, 10, 5, 15, 3, 9, 6, 12],
            "age_group": ["<30", "60+", "30-60", "60+", "<30", "30-60", "60+", "<30"],
        }
    )
    target = [0, 1, 0, 1, 0, 1, 0, 1]
    preprocess = ColumnTransformer(
        transformers=[
            ("numeric", SimpleImputer(strategy="median"), ["time_in_hospital", "num_medications"]),
            (
                "categorical",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("encode", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                ["age_group"],
            ),
        ]
    )
    pipeline = Pipeline(
        [("preprocess", preprocess), ("model", KNeighborsClassifier(n_neighbors=3))]
    )
    pipeline.fit(frame, target)
    assert not hasattr(pipeline.named_steps["model"], "feature_importances_")
    assert not hasattr(pipeline.named_steps["model"], "coef_")

    monkeypatch.setattr(settings, "MODEL_ARTIFACT_DIR", str(tmp_path))
    joblib.dump(pipeline, tmp_path / model_service.MODEL_FILENAME)

    insights = cds_service.generate_insights(
        {"time_in_hospital": 4, "num_medications": 7, "age_group": "30-60"}
    )
    assert insights == []


# --- end-to-end via the real endpoint -----------------------------------------


def test_risk_predict_surfaces_real_insights_end_to_end(
    client: TestClient,
    auth_header,
    patients: list[Patient],
    tmp_path: Path,
    monkeypatch,
) -> None:
    """POST /risk/predict, with a real (not mocked) cached pipeline, returns
    non-empty, association-only insights alongside the probability - N6's
    "surface the insight payload inside the existing /risk/predict response".
    """
    _load_pipeline_into_cache(tmp_path, monkeypatch)
    payload = {
        "patient_id": patients[0].id,
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 35,
        "number_diagnoses": 9,
        "number_inpatient": 3,
        "number_emergency": 1,
        "age_group": "60+",
    }
    response = client.post("/api/v1/risk/predict", json=payload, headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    body = response.json()
    assert len(body["insights"]) > 0
    assert body["insights"][0]["feature"] == "number_inpatient"
    for item in body["insights"]:
        assert "associated with" in item["association"]
        assert not _CAUSAL_VERBS.search(item["association"])
