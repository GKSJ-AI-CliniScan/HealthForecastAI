"""Patient access scoping and anonymisation."""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_doctor_sees_only_assigned_patients(client: TestClient, auth_header) -> None:
    """A doctor's list contains only patients assigned to them."""
    response = client.get("/api/v1/patients", headers=auth_header(Role.DOCTOR, subject="1"))
    assert response.status_code == 200
    patients = response.json()
    assert patients
    assert {p["assigned_doctor_id"] for p in patients} == {1}


def test_hospital_admin_sees_every_patient(client: TestClient, auth_header) -> None:
    """The hospital administrator has hospital wide read access."""
    mine = client.get("/api/v1/patients", headers=auth_header(Role.DOCTOR, subject="1")).json()
    everyone = client.get("/api/v1/patients", headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    assert len(everyone) > len(mine)


def test_doctor_cannot_open_another_doctors_patient(client: TestClient, auth_header) -> None:
    """Asking for a patient outside the doctor's panel returns 404."""
    everyone = client.get("/api/v1/patients", headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    other = next(p for p in everyone if p["assigned_doctor_id"] == 2)
    response = client.get(
        f"/api/v1/patients/{other['id']}", headers=auth_header(Role.DOCTOR, subject="1")
    )
    assert response.status_code == 404


def test_hospital_admin_cannot_create_patients(client: TestClient, auth_header) -> None:
    """Hospital administrators are read only."""
    response = client.post(
        "/api/v1/patients",
        json={"medical_record_number": "MRN-TEST-1"},
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 403


def test_system_admin_creates_patient_and_duplicate_mrn_conflicts(
    client: TestClient, auth_header
) -> None:
    """A patient can be created once; the same MRN again is a conflict."""
    headers = auth_header(Role.SYSTEM_ADMIN)
    body = {"medical_record_number": "MRN-TEST-2", "gender": "Female"}
    assert client.post("/api/v1/patients", json=body, headers=headers).status_code == 201
    assert client.post("/api/v1/patients", json=body, headers=headers).status_code == 409


def test_anonymised_cohort_has_no_identifiers(client: TestClient, auth_header) -> None:
    """Researchers get pseudonyms and no MRN or doctor id."""
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    rows = response.json()
    assert rows
    assert all(row["pseudo_id"].startswith("P-") for row in rows)
    assert all("medical_record_number" not in row for row in rows)
    assert all("assigned_doctor_id" not in row for row in rows)
