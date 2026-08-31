"""Tests for patient access, row scoping and the dashboard metrics."""

from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.models.patient import Patient


def test_doctor_sees_only_assigned_patients(
    client: TestClient, patients: list[Patient], auth_header
) -> None:
    """Row scoping, not just endpoint access, limits what a doctor reads."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    numbers = [row["medical_record_number"] for row in response.json()]
    assert numbers == ["MRN-1"]


def test_hospital_admin_sees_every_patient(
    client: TestClient, patients: list[Patient], auth_header
) -> None:
    """An administrator reads across the hospital."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_researcher_cannot_read_the_identified_list(client: TestClient, auth_header) -> None:
    """The researcher role holds no identified-read permission."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 403


def test_researcher_reads_the_anonymised_cohort(
    client: TestClient, patients: list[Patient], auth_header
) -> None:
    """De-identification happens server side, before the data is sent."""
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 2
    for row in rows:
        assert "medical_record_number" not in row
        assert "assigned_doctor_id" not in row
        assert row["cohort_id"].startswith("P")


def test_doctor_cannot_read_the_anonymised_cohort(client: TestClient, auth_header) -> None:
    """Research export is not an implicit right of clinical staff."""
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


def test_out_of_scope_patient_returns_404_not_403(
    client: TestClient, patients: list[Patient], auth_header
) -> None:
    """A 403 would confirm the record exists, which is itself a disclosure."""
    unassigned_id = patients[1].id
    response = client.get(f"/api/v1/patients/{unassigned_id}", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 404


def test_patient_detail_includes_admissions(
    client: TestClient, patients: list[Patient], auth_header
) -> None:
    """The detail view carries the encounter history used by the risk model."""
    response = client.get(f"/api/v1/patients/{patients[0].id}", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 200
    body = response.json()
    assert len(body["admissions"]) == 1
    assert body["admissions"][0]["readmitted_within_30"] is True


def test_only_write_permission_can_create_a_patient(client: TestClient, auth_header) -> None:
    """Creation is restricted to roles holding patient:write."""
    payload = {
        "medical_record_number": "MRN-NEW",
        "age_group": "[60-70)",
        "gender": "Female",
        "primary_diagnosis": "428",
    }
    denied = client.post("/api/v1/patients", json=payload, headers=auth_header(Role.RESEARCHER))
    assert denied.status_code == 403

    allowed = client.post("/api/v1/patients", json=payload, headers=auth_header(Role.SYSTEM_ADMIN))
    assert allowed.status_code == 201


def test_age_group_outside_the_dataset_buckets_is_rejected(client: TestClient, auth_header) -> None:
    """Free-text ages would break the feature the model was trained on."""
    response = client.post(
        "/api/v1/patients",
        json={"medical_record_number": "MRN-BAD", "age_group": "75"},
        headers=auth_header(Role.SYSTEM_ADMIN),
    )
    assert response.status_code == 422


def test_dashboard_stats_are_scoped_to_the_caller(
    client: TestClient, patients: list[Patient], auth_header
) -> None:
    """A doctor's dashboard reflects their caseload, not the whole hospital."""
    doctor = client.get("/api/v1/patients/stats", headers=auth_header(Role.DOCTOR)).json()
    assert doctor["scope"] == "assigned"
    assert doctor["total_patients"] == 1
    assert doctor["total_admissions"] == 1
    assert doctor["readmission_rate_percent"] == 100.0

    admin = client.get("/api/v1/patients/stats", headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    assert admin["scope"] == "hospital"
    assert admin["total_patients"] == 2
    assert admin["readmission_rate_percent"] == 50.0


def test_stats_do_not_divide_by_zero_without_data(client: TestClient, auth_header) -> None:
    """An empty database must render a dashboard, not raise a 500."""
    response = client.get("/api/v1/patients/stats", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    assert response.json()["readmission_rate_percent"] == 0.0


def test_patient_endpoints_require_authentication(client: TestClient) -> None:
    """No patient route is reachable without a token."""
    for path in ("/api/v1/patients", "/api/v1/patients/stats", "/api/v1/patients/anonymised"):
        assert client.get(path).status_code == 401
