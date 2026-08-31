"""Patient management tests.

The scope tests are the important ones: they prove a doctor cannot read, search
for, or edit a patient outside their assignment through any route.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.doctor_patient_repository import DoctorPatientRepository
from app.repositories.patient_repository import PatientRepository


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def make_doctor(db_session: Session, email: str) -> User:
    user = User(
        email=email,
        full_name="Scope Doctor",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def doctor_header(user: User) -> dict[str, str]:
    token = create_access_token(subject=str(user.id), role=str(Role.DOCTOR))
    return {"Authorization": f"Bearer {token}"}


def create_patient(client: TestClient, auth_header, mrn: str, **extra) -> dict:
    response = client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={"medical_record_number": mrn, **extra},
    )
    assert response.status_code == 201, response.text
    return response.json()


# --------------------------------------------------------------------------
# Create
# --------------------------------------------------------------------------


def test_create_returns_the_new_patient(client: TestClient, auth_header) -> None:
    """POST /patients persists and returns the record."""
    body = create_patient(client, auth_header, "MRN-100", primary_diagnosis="Diabetes")
    assert body["medical_record_number"] == "MRN-100"
    assert body["primary_diagnosis"] == "Diabetes"
    assert body["id"] > 0


def test_create_is_no_longer_a_501(client: TestClient, auth_header) -> None:
    """The Milestone 1 stub is gone."""
    response = client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={"medical_record_number": "MRN-101"},
    )
    assert response.status_code != 501


def test_create_rejects_a_duplicate_record_number(client: TestClient, auth_header) -> None:
    """A medical record number identifies one patient."""
    create_patient(client, auth_header, "MRN-102")
    response = client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={"medical_record_number": "MRN-102"},
    )
    assert response.status_code == 409


@pytest.mark.parametrize("role", [Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER])
def test_only_system_admin_may_write_patients(client: TestClient, auth_header, role: Role) -> None:
    """The access matrix grants patient:write to the system administrator alone."""
    response = client.post(
        "/api/v1/patients",
        headers=auth_header(role),
        json={"medical_record_number": "MRN-nope"},
    )
    assert response.status_code == 403


# --------------------------------------------------------------------------
# List, read and search
# --------------------------------------------------------------------------


def test_list_returns_created_patients(client: TestClient, auth_header) -> None:
    """A hospital wide role sees every patient and a usable total."""
    create_patient(client, auth_header, "MRN-200")
    create_patient(client, auth_header, "MRN-201")
    response = client.get("/api/v1/patients", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "2"
    assert len(response.json()) == 2


def test_list_paginates(client: TestClient, auth_header) -> None:
    """limit and offset return disjoint pages."""
    for index in range(4):
        create_patient(client, auth_header, f"MRN-30{index}")
    header = admin(auth_header)
    first = client.get("/api/v1/patients?limit=2&offset=0", headers=header).json()
    second = client.get("/api/v1/patients?limit=2&offset=2", headers=header).json()
    assert {p["id"] for p in first}.isdisjoint({p["id"] for p in second})


def test_search_matches_record_number_and_diagnosis(client: TestClient, auth_header) -> None:
    """The q parameter searches both indexed text columns, case insensitively."""
    create_patient(client, auth_header, "MRN-400", primary_diagnosis="Cardiac failure")
    create_patient(client, auth_header, "MRN-401", primary_diagnosis="Diabetes")
    header = admin(auth_header)
    assert len(client.get("/api/v1/patients?q=mrn-400", headers=header).json()) == 1
    assert len(client.get("/api/v1/patients?q=CARDIAC", headers=header).json()) == 1
    assert client.get("/api/v1/patients?q=oncology", headers=header).json() == []


def test_read_returns_one_patient(client: TestClient, auth_header) -> None:
    """GET /patients/{id} returns the requested record."""
    created = create_patient(client, auth_header, "MRN-500")
    response = client.get(f"/api/v1/patients/{created['id']}", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json()["medical_record_number"] == "MRN-500"


def test_read_returns_404_for_a_missing_patient(client: TestClient, auth_header) -> None:
    """An unknown id is a 404, not a 500."""
    assert client.get("/api/v1/patients/9999", headers=admin(auth_header)).status_code == 404


def test_anonymised_route_is_not_shadowed_by_the_id_route(client: TestClient, auth_header) -> None:
    """/patients/anonymised must not be parsed as /patients/{patient_id}."""
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    assert response.json() == []


# --------------------------------------------------------------------------
# Doctor scope, enforced through the API
# --------------------------------------------------------------------------


def test_doctor_lists_only_assigned_patients(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A doctor's list is narrowed to their own caseload."""
    doctor = make_doctor(db_session, "scoped@hospital.org")
    mine = create_patient(client, auth_header, "MRN-600", assigned_doctor_id=doctor.id)
    create_patient(client, auth_header, "MRN-601")

    response = client.get("/api/v1/patients", headers=doctor_header(doctor))
    assert response.status_code == 200
    assert [p["id"] for p in response.json()] == [mine["id"]]
    assert response.headers["X-Total-Count"] == "1"


def test_doctor_sees_a_patient_granted_through_the_map(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A doctor_patient_map row widens the caseload without a primary assignment."""
    doctor = make_doctor(db_session, "mapped@hospital.org")
    shared = create_patient(client, auth_header, "MRN-610")
    DoctorPatientRepository(db_session).assign(doctor_id=doctor.id, patient_id=shared["id"])

    response = client.get("/api/v1/patients", headers=doctor_header(doctor))
    assert [p["id"] for p in response.json()] == [shared["id"]]


def test_doctor_gets_404_for_a_patient_outside_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Out of scope reads as absent, so the response cannot confirm existence."""
    doctor = make_doctor(db_session, "blocked@hospital.org")
    other = create_patient(client, auth_header, "MRN-620")
    response = client.get(f"/api/v1/patients/{other['id']}", headers=doctor_header(doctor))
    assert response.status_code == 404


def test_doctor_search_cannot_reach_outside_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Searching is filtered by scope, so a term cannot widen visibility."""
    doctor = make_doctor(db_session, "searcher@hospital.org")
    create_patient(client, auth_header, "MRN-630", assigned_doctor_id=doctor.id)
    create_patient(client, auth_header, "MRN-631")

    scoped = client.get("/api/v1/patients?q=MRN-63", headers=doctor_header(doctor)).json()
    everyone = client.get("/api/v1/patients?q=MRN-63", headers=admin(auth_header)).json()
    assert len(scoped) == 1
    assert len(everyone) == 2


def test_researcher_is_refused_both_identifiable_routes(client: TestClient, auth_header) -> None:
    """Researchers reach the anonymised cohort and nothing else."""
    header = auth_header(Role.RESEARCHER)
    assert client.get("/api/v1/patients", headers=header).status_code == 403
    assert client.get("/api/v1/patients/1", headers=header).status_code == 403


def test_hospital_admin_reads_hospital_wide(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A hospital administrator is not narrowed to any doctor's caseload."""
    doctor = make_doctor(db_session, "someone@hospital.org")
    create_patient(client, auth_header, "MRN-640", assigned_doctor_id=doctor.id)
    create_patient(client, auth_header, "MRN-641")
    response = client.get("/api/v1/patients", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert len(response.json()) == 2


# --------------------------------------------------------------------------
# Update
# --------------------------------------------------------------------------


def test_update_applies_only_the_supplied_fields(client: TestClient, auth_header) -> None:
    """A partial update must not blank the fields the caller omitted."""
    created = create_patient(
        client, auth_header, "MRN-700", primary_diagnosis="Diabetes", gender="Female"
    )
    response = client.patch(
        f"/api/v1/patients/{created['id']}",
        headers=admin(auth_header),
        json={"primary_diagnosis": "Cardiac failure"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["primary_diagnosis"] == "Cardiac failure"
    assert body["gender"] == "Female"
    assert body["medical_record_number"] == "MRN-700"


def test_update_can_assign_a_doctor(client: TestClient, auth_header, db_session: Session) -> None:
    """Assigning a doctor brings the patient into that doctor's scope."""
    doctor = make_doctor(db_session, "assignee@hospital.org")
    created = create_patient(client, auth_header, "MRN-710")
    assert client.get("/api/v1/patients", headers=doctor_header(doctor)).json() == []

    client.patch(
        f"/api/v1/patients/{created['id']}",
        headers=admin(auth_header),
        json={"assigned_doctor_id": doctor.id},
    )
    assert len(client.get("/api/v1/patients", headers=doctor_header(doctor)).json()) == 1


def test_update_rejects_an_empty_body(client: TestClient, auth_header) -> None:
    """An update that changes nothing is a client error, not a silent no-op."""
    created = create_patient(client, auth_header, "MRN-720")
    response = client.patch(
        f"/api/v1/patients/{created['id']}", headers=admin(auth_header), json={}
    )
    assert response.status_code == 400


def test_update_cannot_rewrite_the_record_number(client: TestClient, auth_header) -> None:
    """The medical record number is the record's identity, not an attribute."""
    created = create_patient(client, auth_header, "MRN-730")
    client.patch(
        f"/api/v1/patients/{created['id']}",
        headers=admin(auth_header),
        json={"medical_record_number": "MRN-hijacked"},
    )
    still = client.get(f"/api/v1/patients/{created['id']}", headers=admin(auth_header)).json()
    assert still["medical_record_number"] == "MRN-730"


def test_update_returns_404_for_a_missing_patient(client: TestClient, auth_header) -> None:
    """An unknown id is a 404."""
    response = client.patch(
        "/api/v1/patients/9999", headers=admin(auth_header), json={"gender": "Male"}
    )
    assert response.status_code == 404


# --------------------------------------------------------------------------
# Audit trail
# --------------------------------------------------------------------------


def test_patient_access_is_audited(client: TestClient, auth_header, db_session: Session) -> None:
    """FR-AUD-02: every access to a patient record is recorded."""
    created = create_patient(client, auth_header, "MRN-800")
    client.get(f"/api/v1/patients/{created['id']}", headers=admin(auth_header))
    actions = [e.action for e in AuditRepository(db_session).list_recent()]
    assert "patient.create" in actions
    assert "patient.read" in actions


def test_an_out_of_scope_attempt_is_audited_as_a_failure(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """A refused read is the entry an investigation needs most."""
    doctor = make_doctor(db_session, "prober@hospital.org")
    other = create_patient(client, auth_header, "MRN-810")
    client.get(f"/api/v1/patients/{other['id']}", headers=doctor_header(doctor))
    failures = [
        e
        for e in AuditRepository(db_session).list_recent()
        if e.action == "patient.read" and e.outcome == "failure"
    ]
    assert len(failures) == 1
    assert failures[0].actor_id == doctor.id


def test_repository_and_api_scope_agree(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """The API must not be more permissive than the repository predicate."""
    doctor = make_doctor(db_session, "agree@hospital.org")
    mine = create_patient(client, auth_header, "MRN-900", assigned_doctor_id=doctor.id)
    create_patient(client, auth_header, "MRN-901")

    from_api = {
        p["id"] for p in client.get("/api/v1/patients", headers=doctor_header(doctor)).json()
    }
    from_repo = {p.id for p in PatientRepository(db_session).list_patients(doctor_id=doctor.id)}
    assert from_api == from_repo == {mine["id"]}
