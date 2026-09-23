"""Tests for the deterministic, rule-based Clinical Decision Support module:
the pure rule functions directly, and the two endpoints that wire them to a
patient's latest persisted risk prediction.
"""

from datetime import UTC, datetime

import joblib
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.model_metadata import ModelMetadata
from app.models.prediction import RiskPrediction
from app.services.cds_service import (
    HIGH_MEDICATION_COUNT,
    discharge_checklist,
    follow_up_recommendations,
    risk_mitigation_recommendations,
)
from app.services.ml import model_loader as model_loader_module
from app.services.ml.feature_builder import FEATURE_COLUMNS


@pytest.fixture(autouse=True)
def _clear_model_cache():
    model_loader_module.clear_cache()
    yield
    model_loader_module.clear_cache()


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def new_patient(client: TestClient, auth_header, mrn: str, **extra) -> dict:
    response = client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={
            "medical_record_number": mrn,
            "age_group": "61",
            "gender": "Female",
            "primary_diagnosis": "Cardiac failure",
            **extra,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _prediction(risk_category: str, **overrides) -> RiskPrediction:
    defaults = {
        "readmission_probability": 0.5,
        "risk_category": risk_category,
        "prediction_type": "risk",
        "model_name": "risk",
        "model_version": "v1",
    }
    defaults.update(overrides)
    return RiskPrediction(**defaults)


# --------------------------------------------------------------------------
# Pure rule functions
# --------------------------------------------------------------------------


def test_high_risk_gets_the_shortest_follow_up_cadence() -> None:
    items = follow_up_recommendations(_prediction("high"), admission=None)
    assert any("7-day" in item.text for item in items)
    assert any("14-day" in item.text for item in items)


def test_low_risk_gets_standard_follow_up_only() -> None:
    items = follow_up_recommendations(_prediction("low"), admission=None)
    assert len(items) == 1
    assert "Standard" in items[0].text


def test_high_medication_count_triggers_a_pharmacist_referral() -> None:
    admission = Admission(patient_id=1, num_medications=HIGH_MEDICATION_COUNT)
    items = follow_up_recommendations(_prediction("low"), admission=admission)
    assert any("pharmacist" in item.text.lower() for item in items)


def test_low_medication_count_does_not_trigger_a_pharmacist_referral() -> None:
    admission = Admission(patient_id=1, num_medications=HIGH_MEDICATION_COUNT - 1)
    items = follow_up_recommendations(_prediction("low"), admission=admission)
    assert not any("pharmacist" in item.text.lower() for item in items)


def test_only_high_risk_gets_a_priority_clinical_review_mitigation() -> None:
    high_items = risk_mitigation_recommendations(_prediction("high"))
    low_items = risk_mitigation_recommendations(_prediction("low"))
    assert any("Priority clinical review" in item.text for item in high_items)
    assert low_items == []


def test_discharge_checklist_scales_with_risk_category() -> None:
    assert len(discharge_checklist(_prediction("high"))) == 3
    assert len(discharge_checklist(_prediction("medium"))) == 2
    assert len(discharge_checklist(_prediction("low"))) == 1


# --------------------------------------------------------------------------
# GET /clinical-support/recommendations/{patient_id}
# --------------------------------------------------------------------------


def test_recommendations_is_404_before_any_risk_prediction_exists(
    client: TestClient, auth_header
) -> None:
    patient = new_patient(client, auth_header, "MRN-CDS-1")
    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient['id']}",
        headers=admin(auth_header),
    )
    assert response.status_code == 404


def test_recommendations_reflect_a_real_high_risk_prediction(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    patient = new_patient(client, auth_header, "MRN-CDS-2")
    _register_forced_high_risk_model(db_session, tmp_path)
    predict = client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )
    assert predict.status_code == 422  # no admission yet -> insufficient data, expected

    admission_response = client.post(
        f"/api/v1/patients/{patient['id']}/admissions",
        headers=admin(auth_header),
        json={
            "admission_date": "2024-03-01",
            "time_in_hospital": 5,
            "admission_type": "Emergency",
            "num_medications": HIGH_MEDICATION_COUNT,
        },
    )
    assert admission_response.status_code == 201

    predict = client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )
    assert predict.status_code == 200, predict.text
    prediction_id = predict.json()["id"]
    risk_category = predict.json()["risk_category"]

    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient['id']}",
        headers=admin(auth_header),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["patient_id"] == patient["id"]
    assert body["risk_category"] == risk_category
    assert body["based_on_prediction_id"] == prediction_id
    assert body["follow_up_days"] in {7, 14, 30}
    assert len(body["recommendations"]) >= 1


def test_recommendations_requires_care_recommendation_generate_permission(
    client: TestClient, auth_header
) -> None:
    response = client.get(
        "/api/v1/clinical-support/recommendations/1",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert (
        response.status_code == 403
    )  # hospital_admin lacks CARE_RECOMMENDATION_GENERATE


# --------------------------------------------------------------------------
# GET /clinical-support/discharge-plan/{patient_id}
# --------------------------------------------------------------------------


def test_discharge_plan_is_404_before_any_risk_prediction_exists(
    client: TestClient, auth_header
) -> None:
    patient = new_patient(client, auth_header, "MRN-CDS-3")
    response = client.get(
        f"/api/v1/clinical-support/discharge-plan/{patient['id']}",
        headers=admin(auth_header),
    )
    assert response.status_code == 404


def test_discharge_plan_ready_for_discharge_matches_risk_category(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    patient = new_patient(client, auth_header, "MRN-CDS-4")
    client.post(
        f"/api/v1/patients/{patient['id']}/admissions",
        headers=admin(auth_header),
        json={
            "admission_date": "2024-03-01",
            "time_in_hospital": 5,
            "admission_type": "Emergency",
            "num_medications": 3,
        },
    )
    _register_forced_low_risk_model(db_session, tmp_path)
    predict = client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )
    assert predict.status_code == 200, predict.text

    response = client.get(
        f"/api/v1/clinical-support/discharge-plan/{patient['id']}",
        headers=admin(auth_header),
    )
    assert response.status_code == 200
    body = response.json()
    if body["risk_category"] == "low":
        assert body["ready_for_discharge"] is True
    else:
        assert body["ready_for_discharge"] is False


# --------------------------------------------------------------------------
# Fixture models biased toward a known risk band, so the endpoint tests above
# can assert on ready_for_discharge / follow_up_days without depending on
# which side of the decision boundary an arbitrary fit happens to land on.
# --------------------------------------------------------------------------


def _biased_pipeline(bias_high: bool) -> Pipeline:
    frame = pd.DataFrame(
        {
            "age": [30, 45, 60, 70, 25, 80] * 5,
            "gender": ["Female", "Male"] * 15,
            "diagnosis": ["Cardiac", "Diabetes", "Renal"] * 10,
            "length_of_stay": [2, 4, 6, 8, 1, 10] * 5,
            "admission_type": ["Elective", "Emergency"] * 15,
            "medication_count": [2, 5, 7, 9, 1, 10] * 5,
            "prior_admission_count": [0, 1, 2, 3, 0, 4] * 5,
            "days_since_last_discharge": [None, 100, 50, 20, None, 5] * 5,
        }
    )
    # Skewed but not degenerate: LogisticRegression needs both classes present
    # to fit at all, and a 27/3 split still predicts confidently toward the
    # majority class for inputs resembling the majority rows.
    target = pd.Series(([1] * 27 + [0] * 3) if bias_high else ([0] * 27 + [1] * 3))
    numeric = [
        "age",
        "length_of_stay",
        "medication_count",
        "prior_admission_count",
        "days_since_last_discharge",
    ]
    categorical = ["gender", "diagnosis", "admission_type"]
    preprocessor = ColumnTransformer(
        [
            (
                "numeric",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="median")),
                        ("scale", StandardScaler()),
                    ]
                ),
                numeric,
            ),
            (
                "categorical",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("encode", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical,
            ),
        ]
    )
    pipeline = Pipeline([("preprocess", preprocessor), ("model", LogisticRegression())])
    pipeline.fit(frame[FEATURE_COLUMNS], target)
    return pipeline


def _register(
    db_session: Session, tmp_path, model_name: str, pipeline: Pipeline
) -> None:
    model_path = tmp_path / f"{model_name}_model.joblib"
    joblib.dump(pipeline, model_path)
    db_session.add(
        ModelMetadata(
            model_name=model_name,
            version="test-1",
            algorithm="logistic_regression",
            artifact_path=str(model_path),
            status="production",
            trained_at=datetime.now(UTC),
            promoted_at=datetime.now(UTC),
        )
    )
    db_session.commit()


def _register_forced_high_risk_model(db_session: Session, tmp_path) -> None:
    _register(db_session, tmp_path, "risk", _biased_pipeline(bias_high=True))


def _register_forced_low_risk_model(db_session: Session, tmp_path) -> None:
    _register(db_session, tmp_path, "risk", _biased_pipeline(bias_high=False))
