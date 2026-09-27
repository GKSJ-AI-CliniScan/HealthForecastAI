"""Tests for the research anonymisation utilities and the /patients/anonymised
endpoint, including the re-identification-risk cohort-size guard.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.patient import Patient
from app.services.patient_service import CohortTooSmallError, PatientService
from app.utils.anonymisation import anonymise_patient, generalise_age, pseudonymise


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def _make_patient(db_session: Session, mrn: str, **overrides) -> Patient:
    patient = Patient(medical_record_number=mrn, **overrides)
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


# --------------------------------------------------------------------------
# pseudonymise / generalise_age / anonymise_patient
# --------------------------------------------------------------------------


def test_pseudonymise_is_deterministic_for_the_same_salt() -> None:
    assert pseudonymise("42", "salt-a") == pseudonymise("42", "salt-a")


def test_pseudonymise_differs_across_salts() -> None:
    assert pseudonymise("42", "salt-a") != pseudonymise("42", "salt-b")


def test_pseudonymise_never_contains_the_raw_identifier() -> None:
    assert "42" not in pseudonymise("42", "salt-a")


def test_generalise_age_buckets_a_raw_numeric_age() -> None:
    assert generalise_age("61") == "60-69"
    assert generalise_age("0") == "0-9"


def test_generalise_age_passes_through_an_already_banded_value() -> None:
    """The Diabetes 130-US profile stores age_group as a band already."""
    assert generalise_age("[70-80)") == "[70-80)"


def test_generalise_age_handles_none() -> None:
    assert generalise_age(None) is None


def test_anonymise_patient_drops_the_medical_record_number(db_session: Session) -> None:
    patient = _make_patient(
        db_session, "MRN-SECRET-1", age_group="61", gender="Female", primary_diagnosis="Cardiac"
    )
    result = anonymise_patient(patient, salt="test-salt")

    assert "medical_record_number" not in result
    assert "MRN-SECRET-1" not in str(result.values())
    assert result["age_group"] == "60-69"
    assert result["pseudo_id"].startswith("PT-")


# --------------------------------------------------------------------------
# PatientService.list_for_research
# --------------------------------------------------------------------------


def test_list_for_research_raises_below_the_minimum(db_session: Session) -> None:
    _make_patient(db_session, "MRN-RES-1")
    from app.api.deps import CurrentUser

    researcher = CurrentUser(subject="1", role=Role.RESEARCHER)
    with pytest.raises(CohortTooSmallError) as exc_info:
        PatientService(db_session).list_for_research(researcher, min_cohort_size=10)
    assert exc_info.value.size == 1
    assert exc_info.value.minimum == 10


def test_list_for_research_succeeds_at_the_minimum(db_session: Session) -> None:
    for i in range(5):
        _make_patient(db_session, f"MRN-RES-MIN-{i}")
    from app.api.deps import CurrentUser

    researcher = CurrentUser(subject="1", role=Role.RESEARCHER)
    rows = PatientService(db_session).list_for_research(researcher, min_cohort_size=5)
    assert len(rows) == 5


# --------------------------------------------------------------------------
# GET /patients/anonymised
# --------------------------------------------------------------------------


def test_anonymised_endpoint_never_exposes_the_medical_record_number(
    client: TestClient, auth_header
) -> None:
    for i in range(10):
        client.post(
            "/api/v1/patients",
            headers=admin(auth_header),
            json={"medical_record_number": f"MRN-ENDPOINT-{i}", "age_group": "61"},
        )

    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 10
    for entry in body:
        assert set(entry) == {"pseudo_id", "age_group", "gender", "primary_diagnosis"}
        assert entry["age_group"] == "60-69"


def test_anonymised_endpoint_returns_422_for_a_small_hospital(
    client: TestClient, auth_header
) -> None:
    client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={"medical_record_number": "MRN-SMALL-1"},
    )

    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 422
    body = response.json()["detail"]
    assert body == {"error": "cohort_too_small", "minimum": 10, "actual": 1}


def test_anonymised_endpoint_is_forbidden_for_a_doctor(client: TestClient, auth_header) -> None:
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403
