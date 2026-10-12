"""Tests for Milestone 3 Treatment Effectiveness & Clinical Decision Support."""

from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.models.prediction import RiskPrediction


def test_treatment_effectiveness_endpoint(client: TestClient, make_user, auth_header):
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment", headers=auth_header(admin))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_recovery_trends_endpoint(client: TestClient, make_user, auth_header):
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/treatment/recovery-trends", headers=auth_header(admin))
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)


def test_care_recommendations_endpoint(client: TestClient, make_user, make_patient, auth_header):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}", headers=auth_header(doctor)
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == patient.id
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)


def test_discharge_plan_endpoint(client: TestClient, make_user, make_patient, auth_header):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    response = client.get(
        f"/api/v1/clinical-support/discharge-plan/{patient.id}", headers=auth_header(doctor)
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == patient.id
    assert "risk_mitigation" in data
    assert "checklist" in data


def test_care_recommendations_do_not_invent_a_low_band(
    client: TestClient, make_user, make_patient, auth_header
):
    """An unscored patient is reported as unscored, not placed in the lowest band."""
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    data = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}", headers=auth_header(doctor)
    ).json()
    assert data["model_scored"] is False
    assert data["risk_category"] is None
    assert data["readmission_probability"] is None
    assert data["follow_up_days"] is None
    assert "No readmission score" in data["clinical_insights"]["risk_mitigation"]


def test_cohort_insights_list_scopes_and_marks_unscored(
    client: TestClient, make_user, make_patient, auth_header
):
    doctor = make_user(Role.DOCTOR)
    other_doctor = make_user(Role.DOCTOR)
    mine = make_patient(assigned_doctor_id=doctor.id)
    make_patient(assigned_doctor_id=other_doctor.id)

    response = client.get("/api/v1/clinical-support/insights", headers=auth_header(doctor))
    assert response.status_code == 200
    body = response.json()
    assert [item["patient_id"] for item in body["items"]] == [mine.id]
    assert body["total"] == 1
    assert body["items"][0]["model_scored"] is False
    assert body["items"][0]["insights"] is None
    assert "model" in body


def test_cohort_insights_return_latest_score_and_saved_insights(
    client: TestClient, db, make_user, make_patient, auth_header
):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    for probability, version in ((0.4, "older"), (0.82, "newest")):
        db.add(
            RiskPrediction(
                patient_id=patient.id,
                readmission_probability=probability,
                risk_category="high" if probability > 0.7 else "medium",
                model_name="random_forest",
                model_version=version,
                clinical_insights=(
                    {"risk_mitigation": "saved plan"} if version == "newest" else None
                ),
            )
        )
    db.commit()

    item = client.get("/api/v1/clinical-support/insights", headers=auth_header(doctor)).json()[
        "items"
    ][0]
    assert item["model_scored"] is True
    assert item["risk_category"] == "high"
    assert item["model_version"] == "newest"
    assert item["insights"] == {"risk_mitigation": "saved plan"}


def test_single_patient_insights_endpoint(client: TestClient, make_user, make_patient, auth_header):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    response = client.get(
        f"/api/v1/clinical-support/insights/{patient.id}", headers=auth_header(doctor)
    )
    assert response.status_code == 200
    assert response.json()["insights"] is None

    stranger = make_user(Role.DOCTOR)
    blocked = client.get(
        f"/api/v1/clinical-support/insights/{patient.id}", headers=auth_header(stranger)
    )
    assert blocked.status_code == 404
