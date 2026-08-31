"""Patient CRUD and Doctor scoping test suite."""

import pytest
from fastapi.testclient import TestClient


def test_doctor_sees_only_assigned_patients(client: TestClient, user_tokens: dict[str, str]):
    """Doctor 1 should only see Patient 1 (assigned), not Patient 2 (unassigned)."""
    response = client.get("/api/v1/patients", headers={"Authorization": user_tokens["DOCTOR"]})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["patient_identifier"] == "PAT-TEST-001"


def test_doctor_cannot_access_unassigned_patient_details(client: TestClient, user_tokens: dict[str, str]):
    """Doctor 1 should get 403 when requesting details of Patient 2."""
    # Find patient 2 ID using admin token
    admin_resp = client.get("/api/v1/patients", headers={"Authorization": user_tokens["HOSPITAL_ADMIN"]})
    patients = admin_resp.json()["items"]
    pat2 = next(p for p in patients if p["patient_identifier"] == "PAT-TEST-002")

    # Doctor requests unassigned patient 2
    doc_resp = client.get(f"/api/v1/patients/{pat2['id']}", headers={"Authorization": user_tokens["DOCTOR"]})
    assert doc_resp.status_code == 403


def test_hospital_admin_sees_all_patients(client: TestClient, user_tokens: dict[str, str]):
    """Hospital admin should see all patients."""
    response = client.get("/api/v1/patients", headers={"Authorization": user_tokens["HOSPITAL_ADMIN"]})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) >= 2


def test_patient_creation_and_update(client: TestClient, user_tokens: dict[str, str]):
    """Test creating and updating a patient."""
    create_payload = {
        "patient_identifier": "PAT-NEW-999",
        "first_name": "Clara",
        "last_name": "Oswald",
        "date_of_birth": "1986-11-23",
        "gender": "Female",
        "phone": "+1-555-9999",
        "email": "clara@example.com",
        "address": "77 London Road",
    }
    create_resp = client.post(
        "/api/v1/patients",
        json=create_payload,
        headers={"Authorization": user_tokens["DOCTOR"]},
    )
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    # Update patient
    update_resp = client.put(
        f"/api/v1/patients/{created_id}",
        json={"first_name": "Clara Updated"},
        headers={"Authorization": user_tokens["DOCTOR"]},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["first_name"] == "Clara Updated"
