"""Tests for the risk and readmission prediction endpoints.

Exercises the real inference path end to end (feature assembly -> a real
fitted sklearn pipeline -> persistence into risk_predictions) against a tiny
fixture model, since no real trained artefact is available in this
environment - see ml/data/README.md for why.
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
from app.core.security import create_access_token
from app.models.model_metadata import ModelMetadata
from app.models.user import User
from app.services.ml import model_loader as model_loader_module
from app.services.ml.feature_builder import FEATURE_COLUMNS


@pytest.fixture(autouse=True)
def _clear_model_cache():
    model_loader_module.clear_cache()
    yield
    model_loader_module.clear_cache()


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def make_doctor(db_session: Session, email: str) -> User:
    user = User(
        email=email,
        full_name="Ward Doctor",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def doctor_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), str(Role.DOCTOR))}"}


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


def new_admission(client: TestClient, auth_header, patient_id: int, **fields) -> dict:
    payload = {
        "admission_date": "2024-03-01",
        "time_in_hospital": 5,
        "admission_type": "Emergency",
        "num_medications": 7,
        **fields,
    }
    response = client.post(
        f"/api/v1/patients/{patient_id}/admissions",
        headers=admin(auth_header),
        json=payload,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _tiny_pipeline() -> Pipeline:
    frame = pd.DataFrame(
        {
            "age": [30, 45, 60, 70, 25, 80],
            "gender": ["Female", "Male", "Female", "Male", "Female", "Male"],
            "diagnosis": [
                "Cardiac",
                "Diabetes",
                "Cardiac",
                "Renal",
                "Diabetes",
                "Cardiac",
            ],
            "length_of_stay": [2, 4, 6, 8, 1, 10],
            "admission_type": [
                "Elective",
                "Emergency",
                "Emergency",
                "Emergency",
                "Elective",
                "Emergency",
            ],
            "medication_count": [2, 5, 7, 9, 1, 10],
            "prior_admission_count": [0, 1, 2, 3, 0, 4],
            "days_since_last_discharge": [None, 100, 50, 20, None, 5],
        }
    )
    target = pd.Series([0, 0, 1, 1, 0, 1])
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


def register_model(db_session: Session, tmp_path, model_name: str) -> None:
    model_path = tmp_path / f"{model_name}_model.joblib"
    joblib.dump(_tiny_pipeline(), model_path)
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


# --------------------------------------------------------------------------
# POST /risk/predict
# --------------------------------------------------------------------------


def test_predict_risk_persists_and_returns_a_real_score(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    patient = new_patient(client, auth_header, "MRN-RISK-1")
    new_admission(client, auth_header, patient["id"])

    response = client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["patient_id"] == patient["id"]
    assert body["prediction_type"] == "risk"
    assert 0.0 <= body["readmission_probability"] <= 1.0
    assert body["risk_category"] in {"low", "medium", "high"}
    assert body["model_name"] == "risk"
    assert body["admission_id"] is None
    assert body["id"] is not None


def test_predict_risk_is_404_for_a_patient_outside_doctor_scope(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    patient = new_patient(client, auth_header, "MRN-RISK-2")
    new_admission(client, auth_header, patient["id"])
    unrelated_doctor = make_doctor(db_session, "other.doctor@hospital.org")

    response = client.post(
        "/api/v1/risk/predict",
        headers=doctor_header(unrelated_doctor),
        json={"patient_id": patient["id"]},
    )
    assert response.status_code == 404


def test_predict_risk_is_422_when_the_patient_has_no_admissions(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    patient = new_patient(client, auth_header, "MRN-RISK-3")

    response = client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["error"] == "insufficient_patient_data"


def test_predict_risk_is_503_when_no_model_is_registered(client: TestClient, auth_header) -> None:
    patient = new_patient(client, auth_header, "MRN-RISK-4")
    new_admission(client, auth_header, patient["id"])

    response = client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )
    assert response.status_code == 503


def test_predict_risk_requires_authentication(client: TestClient) -> None:
    response = client.post("/api/v1/risk/predict", json={"patient_id": 1})
    assert response.status_code == 401


def test_predict_risk_is_forbidden_for_researchers(client: TestClient, auth_header) -> None:
    response = client.post(
        "/api/v1/risk/predict",
        headers=auth_header(Role.RESEARCHER),
        json={"patient_id": 1},
    )
    assert response.status_code == 403


# --------------------------------------------------------------------------
# GET /risk/{patient_id} and /risk/{patient_id}/history
# --------------------------------------------------------------------------


def test_get_latest_risk_is_404_before_any_prediction_exists(
    client: TestClient, auth_header
) -> None:
    patient = new_patient(client, auth_header, "MRN-RISK-5")
    response = client.get(f"/api/v1/risk/{patient['id']}", headers=admin(auth_header))
    assert response.status_code == 404


def test_get_latest_risk_returns_the_most_recent_score(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    patient = new_patient(client, auth_header, "MRN-RISK-6")
    new_admission(client, auth_header, patient["id"])
    client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": patient["id"]},
    )

    response = client.get(f"/api/v1/risk/{patient['id']}", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json()["patient_id"] == patient["id"]


def test_risk_history_accumulates_across_repeated_predictions(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    patient = new_patient(client, auth_header, "MRN-RISK-7")
    new_admission(client, auth_header, patient["id"])

    for _ in range(3):
        client.post(
            "/api/v1/risk/predict",
            headers=admin(auth_header),
            json={"patient_id": patient["id"]},
        )

    response = client.get(f"/api/v1/risk/{patient['id']}/history", headers=admin(auth_header))
    assert response.status_code == 200
    assert len(response.json()) == 3


# --------------------------------------------------------------------------
# GET /risk/high-risk
# --------------------------------------------------------------------------


def test_high_risk_list_only_includes_high_category_patients(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    scored = new_patient(client, auth_header, "MRN-HR-1")
    new_admission(client, auth_header, scored["id"])
    client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": scored["id"]},
    )

    response = client.get("/api/v1/risk/high-risk", headers=admin(auth_header))
    assert response.status_code == 200
    for entry in response.json():
        assert entry["risk_category"] == "high"


def test_high_risk_list_is_scoped_to_the_doctors_assigned_patients(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "risk")
    doctor = make_doctor(db_session, "scoped.doctor@hospital.org")
    other_patient = new_patient(client, auth_header, "MRN-HR-2")
    new_admission(client, auth_header, other_patient["id"])
    client.post(
        "/api/v1/risk/predict",
        headers=admin(auth_header),
        json={"patient_id": other_patient["id"]},
    )

    response = client.get("/api/v1/risk/high-risk", headers=doctor_header(doctor))
    assert response.status_code == 200
    assert response.json() == []  # doctor has no assigned patients at all


# --------------------------------------------------------------------------
# POST /risk/readmission
# --------------------------------------------------------------------------


def test_predict_readmission_persists_with_window_and_confidence(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "readmission")
    patient = new_patient(client, auth_header, "MRN-READM-1")
    admission = new_admission(client, auth_header, patient["id"])

    response = client.post(
        "/api/v1/risk/readmission",
        headers=admin(auth_header),
        json={"patient_id": patient["id"], "admission_id": admission["id"]},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["prediction_type"] == "readmission"
    assert body["admission_id"] == admission["id"]
    assert body["readmission_window"] == "30_day"
    assert 0.5 <= body["confidence_score"] <= 1.0


def test_predict_readmission_is_404_for_an_admission_belonging_to_another_patient(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "readmission")
    patient_a = new_patient(client, auth_header, "MRN-READM-2A")
    patient_b = new_patient(client, auth_header, "MRN-READM-2B")
    admission_a = new_admission(client, auth_header, patient_a["id"])

    response = client.post(
        "/api/v1/risk/readmission",
        headers=admin(auth_header),
        json={"patient_id": patient_b["id"], "admission_id": admission_a["id"]},
    )
    assert response.status_code == 404


def test_get_latest_readmission_via_type_query_param(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "readmission")
    patient = new_patient(client, auth_header, "MRN-READM-3")
    admission = new_admission(client, auth_header, patient["id"])
    client.post(
        "/api/v1/risk/readmission",
        headers=admin(auth_header),
        json={"patient_id": patient["id"], "admission_id": admission["id"]},
    )

    # The default (type=risk) must not see the readmission-type row.
    default_response = client.get(f"/api/v1/risk/{patient['id']}", headers=admin(auth_header))
    assert default_response.status_code == 404

    response = client.get(
        f"/api/v1/risk/{patient['id']}?type=readmission", headers=admin(auth_header)
    )
    assert response.status_code == 200
    assert response.json()["prediction_type"] == "readmission"

    history_response = client.get(
        f"/api/v1/risk/{patient['id']}/history?type=readmission", headers=admin(auth_header)
    )
    assert history_response.status_code == 200
    assert len(history_response.json()) == 1


def test_hospital_admin_can_read_back_a_readmission_prediction(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    """Hospital Administrators hold READMISSION_FORECAST_READ, not
    RISK_REPORT_READ - they must still be able to read what they can create."""
    register_model(db_session, tmp_path, "readmission")
    patient = new_patient(client, auth_header, "MRN-READM-4")
    admission = new_admission(client, auth_header, patient["id"])
    client.post(
        "/api/v1/risk/readmission",
        headers=admin(auth_header),
        json={"patient_id": patient["id"], "admission_id": admission["id"]},
    )

    response = client.get(
        f"/api/v1/risk/{patient['id']}?type=readmission",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200


def test_predict_readmission_is_forbidden_for_researchers(client: TestClient, auth_header) -> None:
    response = client.post(
        "/api/v1/risk/readmission",
        headers=auth_header(Role.RESEARCHER),
        json={"patient_id": 1, "admission_id": 1},
    )
    assert response.status_code == 403


# --------------------------------------------------------------------------
# GET /risk/forecast
# --------------------------------------------------------------------------


def test_forecast_is_zero_with_no_readmission_predictions_yet(
    client: TestClient, auth_header
) -> None:
    response = client.get("/api/v1/risk/forecast", headers=admin(auth_header))
    assert response.status_code == 200
    body = response.json()
    assert body["predicted_readmissions"] == 0
    assert body["predicted_rate"] == 0.0
    assert body["horizon_days"] == 30


def test_forecast_reflects_a_real_readmission_prediction(
    client: TestClient, auth_header, db_session: Session, tmp_path
) -> None:
    register_model(db_session, tmp_path, "readmission")
    patient = new_patient(client, auth_header, "MRN-FORECAST-1")
    admission = new_admission(client, auth_header, patient["id"])
    client.post(
        "/api/v1/risk/readmission",
        headers=admin(auth_header),
        json={"patient_id": patient["id"], "admission_id": admission["id"]},
    )

    response = client.get("/api/v1/risk/forecast", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json()["scope"] == "hospital"
