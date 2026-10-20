"""Risk prediction, forecasting, decision support and model endpoints."""

from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.services.model_service import baseline_probability, explain

LOW_RISK = {
    "time_in_hospital": 1,
    "num_medications": 5,
    "num_lab_procedures": 20,
    "number_diagnoses": 3,
}
HIGH_RISK = {
    "time_in_hospital": 12,
    "num_medications": 35,
    "num_lab_procedures": 75,
    "number_diagnoses": 9,
    "number_inpatient": 3,
    "number_emergency": 2,
}


def test_baseline_probability_is_higher_for_sicker_admissions() -> None:
    """More prior visits, a longer stay and more drugs mean a higher score."""
    assert baseline_probability(HIGH_RISK) > baseline_probability(LOW_RISK)
    assert 0.0 <= baseline_probability(LOW_RISK) <= baseline_probability(HIGH_RISK) <= 1.0


def test_explain_lists_the_features_that_raise_risk() -> None:
    """Drivers are ordered by effect and only include features that raise risk."""
    drivers = explain(HIGH_RISK, top=3)
    assert drivers
    assert all(d.contribution > 0 for d in drivers)
    assert [d.contribution for d in drivers] == sorted(
        (d.contribution for d in drivers), reverse=True
    )


def test_predict_returns_a_scored_band(client: TestClient, auth_header) -> None:
    """A high risk admission lands in the high band, a low one in the low band."""
    headers = auth_header(Role.DOCTOR, subject="1")
    high = client.post("/api/v1/risk/predict", json={"patient_id": 1, **HIGH_RISK}, headers=headers)
    low = client.post("/api/v1/risk/predict", json={"patient_id": 1, **LOW_RISK}, headers=headers)
    assert high.status_code == low.status_code == 200
    assert high.json()["risk_category"] == "high"
    assert low.json()["risk_category"] == "low"
    assert high.json()["readmission_probability"] > low.json()["readmission_probability"]


def test_predict_is_denied_to_hospital_admin(client: TestClient, auth_header) -> None:
    """Patient level scoring is not part of the administrator's access."""
    response = client.post(
        "/api/v1/risk/predict",
        json={"patient_id": 1, **LOW_RISK},
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 403


def test_high_risk_list_is_scoped_to_the_doctor(client: TestClient, auth_header) -> None:
    """A doctor's high risk list is a subset of the whole hospital's."""
    mine = client.get("/api/v1/risk/high-risk", headers=auth_header(Role.DOCTOR, subject="1"))
    everyone = client.get("/api/v1/risk/high-risk", headers=auth_header(Role.SYSTEM_ADMIN))
    assert mine.status_code == everyone.status_code == 200
    assert len(mine.json()) <= len(everyone.json())
    assert all(item["risk_category"] == "high" for item in everyone.json())


def test_forecast_grows_with_the_horizon(client: TestClient, auth_header) -> None:
    """A longer horizon never predicts fewer readmissions."""
    headers = auth_header(Role.HOSPITAL_ADMIN)
    short = client.get("/api/v1/risk/forecast?horizon_days=30", headers=headers).json()
    longer = client.get("/api/v1/risk/forecast?horizon_days=60", headers=headers).json()
    assert longer["predicted_readmissions"] >= short["predicted_readmissions"]
    assert 0.0 <= short["predicted_rate"] <= 1.0


def test_forecast_rejects_a_bad_horizon(client: TestClient, auth_header) -> None:
    """The horizon is bounded to 1-90 days."""
    response = client.get(
        "/api/v1/risk/forecast?horizon_days=500", headers=auth_header(Role.DOCTOR)
    )
    assert response.status_code == 422


def test_care_recommendations_for_own_patient(client: TestClient, auth_header) -> None:
    """A doctor gets recommendations and a follow-up date for their own patient."""
    headers = auth_header(Role.DOCTOR, subject="1")
    mine = client.get("/api/v1/patients", headers=headers).json()[0]
    response = client.get(f"/api/v1/clinical-support/recommendations/{mine['id']}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["recommendations"]
    assert body["follow_up_days"] in (3, 7, 14)


def test_model_endpoints_are_system_admin_only(client: TestClient, auth_header) -> None:
    """Model management is restricted and reports the five required metrics."""
    assert client.get("/api/v1/models/metrics", headers=auth_header(Role.DOCTOR)).status_code == 403
    metrics = client.get("/api/v1/models/metrics", headers=auth_header(Role.SYSTEM_ADMIN)).json()
    assert set(metrics) == {"accuracy", "precision", "recall", "f1", "roc_auc"}
