"""Researcher patient de-identification and anonymization test suite."""

import pytest
from fastapi.testclient import TestClient


def test_researcher_receives_anonymized_patient_list(
    client: TestClient, user_tokens: dict[str, str]
):
    """Researcher must receive de-identified records with zero PII."""
    response = client.get("/api/v1/patients", headers={"Authorization": user_tokens["RESEARCHER"]})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) >= 2

    for patient in items:
        # Check anonymized identifiers exist
        assert "anonymized_patient_id" in patient
        assert patient["anonymized_patient_id"].startswith("ANON-PAT-")
        assert patient["is_anonymized"] is True

        # Ensure NO PII is leaked in the JSON payload
        assert "first_name" not in patient
        assert "last_name" not in patient
        assert "full_name" not in patient
        assert "phone" not in patient
        assert "email" not in patient
        assert "address" not in patient
        assert "patient_identifier" not in patient
        # Date of birth should be masked into age_group bracket
        assert "date_of_birth" not in patient
        assert "age_group" in patient


def test_researcher_receives_anonymized_single_patient(
    client: TestClient, user_tokens: dict[str, str]
):
    """Individual patient retrieval by Researcher must also be strictly anonymized."""
    admin_resp = client.get(
        "/api/v1/patients", headers={"Authorization": user_tokens["HOSPITAL_ADMIN"]}
    )
    pat_id = admin_resp.json()["items"][0]["id"]

    res_resp = client.get(
        f"/api/v1/patients/{pat_id}", headers={"Authorization": user_tokens["RESEARCHER"]}
    )
    assert res_resp.status_code == 200
    patient = res_resp.json()

    assert patient["anonymized_patient_id"].startswith("ANON-PAT-")
    assert "first_name" not in patient
    assert "last_name" not in patient
    assert "phone" not in patient
    assert "email" not in patient
