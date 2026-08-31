"""Admission management tests.

The scope tests matter most: an admission must be exactly as reachable as the
patient it belongs to, and no more.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.user import User


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
    return user


def doctor_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), str(Role.DOCTOR))}"}


def new_patient(client: TestClient, auth_header, mrn: str, **extra) -> dict:
    response = client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={"medical_record_number": mrn, **extra},
    )
    assert response.status_code == 201, response.text
    return response.json()


def new_admission(client: TestClient, auth_header, patient_id: int, **fields) -> dict:
    response = client.post(
        f"/api/v1/patients/{patient_id}/admissions",
        headers=admin(auth_header),
        json=fields,
    )
    assert response.status_code == 201, response.text
    return response.json()


# --------------------------------------------------------------------------
# Create and read
# --------------------------------------------------------------------------


def test_create_records_an_admission(client: TestClient, auth_header) -> None:
    """POST returns 201 and links the admission to its patient."""
    patient = new_patient(client, auth_header, "ADM-100")
    body = new_admission(
        client,
        auth_header,
        patient["id"],
        admission_date="2024-01-05",
        discharge_date="2024-01-09",
        time_in_hospital=4,
        readmitted="NO",
    )
    assert body["patient_id"] == patient["id"]
    assert body["time_in_hospital"] == 4


def test_create_rejects_a_discharge_before_admission(client: TestClient, auth_header) -> None:
    """The date ordering rule is refused at the API edge with a 422."""
    patient = new_patient(client, auth_header, "ADM-101")
    response = client.post(
        f"/api/v1/patients/{patient['id']}/admissions",
        headers=admin(auth_header),
        json={"admission_date": "2024-02-10", "discharge_date": "2024-02-01"},
    )
    assert response.status_code == 422


def test_create_rejects_a_negative_stay(client: TestClient, auth_header) -> None:
    """A negative length of stay is not a physically possible encounter."""
    patient = new_patient(client, auth_header, "ADM-102")
    response = client.post(
        f"/api/v1/patients/{patient['id']}/admissions",
        headers=admin(auth_header),
        json={"time_in_hospital": -3},
    )
    assert response.status_code == 422


def test_create_for_a_missing_patient_is_404(client: TestClient, auth_header) -> None:
    """An admission cannot exist without its patient."""
    response = client.post("/api/v1/patients/9999/admissions", headers=admin(auth_header), json={})
    assert response.status_code == 404


def test_timeline_is_newest_first(client: TestClient, auth_header) -> None:
    """The admission history reads most recent to oldest."""
    patient = new_patient(client, auth_header, "ADM-200")
    older = new_admission(client, auth_header, patient["id"], admission_date="2022-03-01")
    newer = new_admission(client, auth_header, patient["id"], admission_date="2024-07-01")
    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions", headers=admin(auth_header)
    )
    assert response.status_code == 200
    assert [a["id"] for a in response.json()] == [newer["id"], older["id"]]
    assert response.headers["X-Total-Count"] == "2"


def test_read_one_admission(client: TestClient, auth_header) -> None:
    """GET returns the single admission."""
    patient = new_patient(client, auth_header, "ADM-300")
    created = new_admission(client, auth_header, patient["id"], admission_type="Emergency")
    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/{created['id']}",
        headers=admin(auth_header),
    )
    assert response.status_code == 200
    assert response.json()["admission_type"] == "Emergency"


def test_admission_of_another_patient_is_404(client: TestClient, auth_header) -> None:
    """An admission id must be read through the patient that owns it."""
    first = new_patient(client, auth_header, "ADM-400")
    second = new_patient(client, auth_header, "ADM-401")
    created = new_admission(client, auth_header, first["id"], admission_type="Elective")
    response = client.get(
        f"/api/v1/patients/{second['id']}/admissions/{created['id']}",
        headers=admin(auth_header),
    )
    assert response.status_code == 404


def test_readmissions_route_is_not_shadowed_by_the_id_route(
    client: TestClient, auth_header
) -> None:
    """/admissions/readmissions must not be parsed as an admission id."""
    patient = new_patient(client, auth_header, "ADM-500")
    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/readmissions", headers=admin(auth_header)
    )
    assert response.status_code == 200
    assert response.json()["patient_id"] == patient["id"]


# --------------------------------------------------------------------------
# Update
# --------------------------------------------------------------------------


def test_update_applies_only_the_supplied_fields(client: TestClient, auth_header) -> None:
    """A partial update must not blank the fields the caller omitted."""
    patient = new_patient(client, auth_header, "ADM-600")
    created = new_admission(
        client, auth_header, patient["id"], admission_type="Emergency", num_medications=5
    )
    response = client.patch(
        f"/api/v1/patients/{patient['id']}/admissions/{created['id']}",
        headers=admin(auth_header),
        json={"num_medications": 9},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["num_medications"] == 9
    assert body["admission_type"] == "Emergency"


def test_update_records_a_readmission_outcome(client: TestClient, auth_header) -> None:
    """Readmission tracking is written by updating the encounter's outcome."""
    patient = new_patient(client, auth_header, "ADM-610")
    created = new_admission(client, auth_header, patient["id"], readmitted="NO")
    response = client.patch(
        f"/api/v1/patients/{patient['id']}/admissions/{created['id']}",
        headers=admin(auth_header),
        json={"readmitted": "<30"},
    )
    assert response.json()["readmitted"] == "<30"


def test_update_cannot_break_the_date_order_with_one_field(client: TestClient, auth_header) -> None:
    """Moving only the discharge date must still respect the stored admission date."""
    patient = new_patient(client, auth_header, "ADM-620")
    created = new_admission(
        client,
        auth_header,
        patient["id"],
        admission_date="2024-05-10",
        discharge_date="2024-05-15",
    )
    response = client.patch(
        f"/api/v1/patients/{patient['id']}/admissions/{created['id']}",
        headers=admin(auth_header),
        json={"discharge_date": "2024-05-01"},
    )
    assert response.status_code == 422


def test_update_rejects_an_empty_body(client: TestClient, auth_header) -> None:
    """An update that changes nothing is a client error."""
    patient = new_patient(client, auth_header, "ADM-630")
    created = new_admission(client, auth_header, patient["id"])
    response = client.patch(
        f"/api/v1/patients/{patient['id']}/admissions/{created['id']}",
        headers=admin(auth_header),
        json={},
    )
    assert response.status_code == 400


# --------------------------------------------------------------------------
# Readmission tracking
# --------------------------------------------------------------------------


def test_readmission_summary_counts_by_label(client: TestClient, auth_header) -> None:
    """Source labels are preserved and genuine readmissions are totalled."""
    patient = new_patient(client, auth_header, "ADM-700")
    for label in ("NO", "NO", "<30", ">30"):
        new_admission(client, auth_header, patient["id"], readmitted=label)

    body = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/readmissions", headers=admin(auth_header)
    ).json()
    assert body["total_admissions"] == 4
    assert body["readmitted_total"] == 2
    assert body["by_label"]["NO"] == 2
    assert body["by_label"]["<30"] == 1


def test_readmission_summary_is_zero_for_a_new_patient(client: TestClient, auth_header) -> None:
    """A patient with no admissions reports zero rather than failing."""
    patient = new_patient(client, auth_header, "ADM-710")
    body = client.get(
        f"/api/v1/patients/{patient['id']}/admissions/readmissions", headers=admin(auth_header)
    ).json()
    assert body["total_admissions"] == 0
    assert body["readmitted_total"] == 0


# --------------------------------------------------------------------------
# Scope is inherited from the patient
# --------------------------------------------------------------------------


def test_doctor_reads_admissions_of_an_assigned_patient(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """In scope patient means in scope admissions."""
    doctor = make_doctor(db_session, "ward@hospital.org")
    patient = new_patient(client, auth_header, "ADM-800", assigned_doctor_id=doctor.id)
    new_admission(client, auth_header, patient["id"], admission_type="Emergency")
    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions", headers=doctor_header(doctor)
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_doctor_cannot_read_admissions_outside_scope(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Out of scope patient means the admissions are unreachable too."""
    doctor = make_doctor(db_session, "outsider@hospital.org")
    patient = new_patient(client, auth_header, "ADM-810")
    created = new_admission(client, auth_header, patient["id"])
    header = doctor_header(doctor)

    assert (
        client.get(f"/api/v1/patients/{patient['id']}/admissions", headers=header).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/v1/patients/{patient['id']}/admissions/{created['id']}", headers=header
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/v1/patients/{patient['id']}/admissions/readmissions", headers=header
        ).status_code
        == 404
    )


@pytest.mark.parametrize("role", [Role.DOCTOR, Role.HOSPITAL_ADMIN, Role.RESEARCHER])
def test_only_system_admin_may_write_admissions(
    client: TestClient, auth_header, role: Role
) -> None:
    """Writing clinical records follows the same patient:write restriction."""
    response = client.post("/api/v1/patients/1/admissions", headers=auth_header(role), json={})
    assert response.status_code == 403


def test_researcher_cannot_read_an_identifiable_timeline(client: TestClient, auth_header) -> None:
    """Researchers get aggregates, never a named patient's encounters."""
    patient = new_patient(client, auth_header, "ADM-900")
    response = client.get(
        f"/api/v1/patients/{patient['id']}/admissions", headers=auth_header(Role.RESEARCHER)
    )
    assert response.status_code == 403


def test_admission_routes_require_a_token(client: TestClient) -> None:
    """No admission route answers an anonymous caller."""
    assert client.get("/api/v1/patients/1/admissions").status_code == 401
    assert client.get("/api/v1/patients/1/admissions/readmissions").status_code == 401
