"""Patient management and scoping tests - Milestone 1.

These encode the access matrix at the API level. A change that makes one of
these pass where it used to fail is a data disclosure, not a feature.
"""

from fastapi.testclient import TestClient

from app.core.rbac import Role


def test_doctor_sees_only_their_own_caseload(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """A doctor's patient list contains their assigned patients and nothing else."""
    mine = make_user(Role.DOCTOR)
    theirs = make_user(Role.DOCTOR)
    make_patient(assigned_doctor_id=mine.id)
    make_patient(assigned_doctor_id=mine.id)
    make_patient(assigned_doctor_id=theirs.id)

    response = client.get("/api/v1/patients", headers=auth_header(mine))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert all(item["assigned_doctor_id"] == mine.id for item in body["items"])


def test_doctor_cannot_open_another_doctors_patient(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """An out-of-scope patient is 404, not 403.

    Returning 403 would confirm the record exists, which is itself a disclosure.
    """
    mine = make_user(Role.DOCTOR)
    theirs = make_user(Role.DOCTOR)
    other_patient = make_patient(assigned_doctor_id=theirs.id)

    response = client.get(f"/api/v1/patients/{other_patient.id}", headers=auth_header(mine))

    assert response.status_code == 404


def test_hospital_admin_sees_every_patient(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """The hospital administrator's view is hospital wide."""
    doctor = make_user(Role.DOCTOR)
    admin = make_user(Role.HOSPITAL_ADMIN)
    make_patient(assigned_doctor_id=doctor.id)
    make_patient(assigned_doctor_id=None)

    response = client.get("/api/v1/patients", headers=auth_header(admin))

    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_hospital_admin_cannot_create_a_patient(client: TestClient, make_user, auth_header) -> None:
    """The brief says the administrator cannot modify patient records."""
    admin = make_user(Role.HOSPITAL_ADMIN)

    response = client.post(
        "/api/v1/patients",
        headers=auth_header(admin),
        json={"medical_record_number": "MRN-NEW-1"},
    )

    assert response.status_code == 403


def test_researcher_is_refused_the_identifiable_list(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """Researchers never reach the identifiable endpoint."""
    make_patient()
    researcher = make_user(Role.RESEARCHER)

    assert client.get("/api/v1/patients", headers=auth_header(researcher)).status_code == 403


def test_researcher_gets_pseudonymised_records_only(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """The anonymised endpoint strips the MRN and every direct identifier."""
    patient = make_patient()
    researcher = make_user(Role.RESEARCHER)

    response = client.get("/api/v1/patients/anonymised", headers=auth_header(researcher))

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["pseudo_id"].startswith("PT-")
    assert patient.medical_record_number not in response.text
    assert "medical_record_number" not in item
    assert "assigned_doctor_id" not in item


def test_pseudonyms_are_stable_across_requests(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """A researcher must be able to follow one subject between queries."""
    make_patient()
    researcher = make_user(Role.RESEARCHER)
    header = auth_header(researcher)

    first = client.get("/api/v1/patients/anonymised", headers=header).json()
    second = client.get("/api/v1/patients/anonymised", headers=header).json()

    assert first["items"][0]["pseudo_id"] == second["items"][0]["pseudo_id"]


def test_doctor_creating_a_patient_keeps_it_on_their_own_caseload(
    client: TestClient, make_user, auth_header
) -> None:
    """A doctor cannot assign a new record to somebody else's caseload."""
    doctor = make_user(Role.DOCTOR)
    other = make_user(Role.DOCTOR)

    response = client.post(
        "/api/v1/patients",
        headers=auth_header(doctor),
        json={"medical_record_number": "MRN-NEW-2", "assigned_doctor_id": other.id},
    )

    assert response.status_code == 201
    assert response.json()["assigned_doctor_id"] == doctor.id


def test_duplicate_medical_record_number_is_rejected(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """The MRN is unique - a duplicate returns 409, not a 500."""
    doctor = make_user(Role.DOCTOR)
    existing = make_patient(assigned_doctor_id=doctor.id)

    response = client.post(
        "/api/v1/patients",
        headers=auth_header(doctor),
        json={"medical_record_number": existing.medical_record_number},
    )

    assert response.status_code == 409


def test_patient_detail_includes_admission_history(
    client: TestClient, make_user, make_patient, make_admission, auth_header
) -> None:
    """Opening a patient returns their encounters, most recent first."""
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id)
    make_admission(patient.id, readmitted="<30")
    make_admission(patient.id, readmitted="NO")

    response = client.get(f"/api/v1/patients/{patient.id}", headers=auth_header(doctor))

    assert response.status_code == 200
    assert len(response.json()["admissions"]) == 2


def test_search_filters_the_scoped_list(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """Search narrows results without widening the caller's scope."""
    doctor = make_user(Role.DOCTOR)
    make_patient(assigned_doctor_id=doctor.id, primary_diagnosis="Circulatory")
    make_patient(assigned_doctor_id=doctor.id, primary_diagnosis="Respiratory")

    response = client.get(
        "/api/v1/patients", headers=auth_header(doctor), params={"search": "circulat"}
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_pagination_reports_the_scoped_total(
    client: TestClient, make_user, make_patient, auth_header
) -> None:
    """The total is the number of patients the caller may see, not the table size."""
    mine = make_user(Role.DOCTOR)
    theirs = make_user(Role.DOCTOR)
    for _ in range(3):
        make_patient(assigned_doctor_id=mine.id)
    make_patient(assigned_doctor_id=theirs.id)

    response = client.get(
        "/api/v1/patients", headers=auth_header(mine), params={"limit": 2, "offset": 0}
    )

    body = response.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


def test_unauthenticated_access_is_refused(client: TestClient) -> None:
    """Every patient endpoint requires a token."""
    assert client.get("/api/v1/patients").status_code == 401
    assert client.get("/api/v1/patients/anonymised").status_code == 401
    assert client.get("/api/v1/patients/1").status_code == 401
