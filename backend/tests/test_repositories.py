"""Repository layer tests.

The doctor scope tests matter most: they are the data-layer half of the "assigned
patients only" restriction the project brief places on the Doctor role. A bug here
leaks patient records regardless of how correct the API guards are.
"""

from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.patient import Patient
from app.models.user import User
from app.repositories import (
    AdmissionRepository,
    DoctorPatientRepository,
    PatientRepository,
    UserRepository,
)


@pytest.fixture
def users(db_session: Session) -> UserRepository:
    return UserRepository(db_session)


@pytest.fixture
def patients(db_session: Session) -> PatientRepository:
    return PatientRepository(db_session)


@pytest.fixture
def admissions(db_session: Session) -> AdmissionRepository:
    return AdmissionRepository(db_session)


@pytest.fixture
def scope(db_session: Session) -> DoctorPatientRepository:
    return DoctorPatientRepository(db_session)


def make_user(repo: UserRepository, email: str, role: Role = Role.DOCTOR) -> User:
    return repo.create(
        email=email,
        full_name=email.split("@")[0].replace(".", " ").title(),
        hashed_password="not-a-real-hash",
        role=str(role),
    )


def make_patient(repo: PatientRepository, mrn: str, doctor_id: int | None = None) -> Patient:
    return repo.create(
        medical_record_number=mrn,
        age_group="[60-70)",
        gender="Female",
        primary_diagnosis="Diabetes",
        assigned_doctor_id=doctor_id,
    )


# --------------------------------------------------------------------------
# UserRepository
# --------------------------------------------------------------------------


def test_get_by_email_is_case_insensitive(users: UserRepository) -> None:
    """An address differing only in case is the same account, not a second one."""
    created = make_user(users, "Ada.Lovelace@hospital.org")
    assert users.get_by_email("ada.lovelace@hospital.org") is not None
    assert users.get_by_email("ADA.LOVELACE@HOSPITAL.ORG").id == created.id


def test_get_by_email_ignores_surrounding_whitespace(users: UserRepository) -> None:
    """A trailing space in a login form must not create a phantom miss."""
    make_user(users, "grace@hospital.org")
    assert users.get_by_email("  grace@hospital.org  ") is not None


def test_get_by_email_returns_none_when_absent(users: UserRepository) -> None:
    """An unknown address resolves to nothing rather than raising."""
    assert users.get_by_email("nobody@hospital.org") is None


def test_email_exists_reports_registration(users: UserRepository) -> None:
    """Uniqueness can be checked before attempting an insert."""
    make_user(users, "taken@hospital.org")
    assert users.email_exists("taken@hospital.org")
    assert not users.email_exists("free@hospital.org")


def test_list_users_filters_by_role(users: UserRepository) -> None:
    """Filtering narrows the page to a single role."""
    make_user(users, "doc@hospital.org", Role.DOCTOR)
    make_user(users, "admin@hospital.org", Role.SYSTEM_ADMIN)
    doctors = users.list_users(role=Role.DOCTOR)
    assert [u.email for u in doctors] == ["doc@hospital.org"]


def test_list_users_filters_by_active_flag(users: UserRepository) -> None:
    """Deactivated accounts can be excluded from the management list."""
    active = make_user(users, "active@hospital.org")
    disabled = make_user(users, "disabled@hospital.org")
    users.update(disabled, is_active=False)
    assert [u.id for u in users.list_users(is_active=True)] == [active.id]
    assert [u.id for u in users.list_users(is_active=False)] == [disabled.id]


def test_list_users_paginates(users: UserRepository) -> None:
    """Paging returns disjoint pages rather than repeating the first rows."""
    for index in range(5):
        make_user(users, f"user{index}@hospital.org")
    first = users.list_users(limit=2, offset=0)
    second = users.list_users(limit=2, offset=2)
    assert len(first) == 2
    assert len(second) == 2
    assert {u.id for u in first}.isdisjoint({u.id for u in second})


def test_count_users_respects_filters(users: UserRepository) -> None:
    """The count used for pagination matches the filtered listing."""
    make_user(users, "d1@hospital.org", Role.DOCTOR)
    make_user(users, "d2@hospital.org", Role.DOCTOR)
    make_user(users, "r1@hospital.org", Role.RESEARCHER)
    assert users.count_users() == 3
    assert users.count_users(role=Role.DOCTOR) == 2


# --------------------------------------------------------------------------
# PatientRepository - doctor scope
# --------------------------------------------------------------------------


def test_doctor_sees_primary_assignment(users: UserRepository, patients: PatientRepository) -> None:
    """patients.assigned_doctor_id alone puts a patient in scope."""
    doctor = make_user(users, "primary@hospital.org")
    mine = make_patient(patients, "MRN-1", doctor_id=doctor.id)
    make_patient(patients, "MRN-2")
    visible = patients.list_patients(doctor_id=doctor.id)
    assert [p.id for p in visible] == [mine.id]


def test_doctor_sees_mapped_patient(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """A doctor_patient_map row alone also puts a patient in scope."""
    doctor = make_user(users, "mapped@hospital.org")
    other = make_patient(patients, "MRN-3")
    scope.assign(doctor_id=doctor.id, patient_id=other.id)
    assert [p.id for p in patients.list_patients(doctor_id=doctor.id)] == [other.id]


def test_scope_is_a_union_without_duplicates(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """A patient who is both primary and mapped appears exactly once."""
    doctor = make_user(users, "both@hospital.org")
    patient = make_patient(patients, "MRN-4", doctor_id=doctor.id)
    scope.assign(doctor_id=doctor.id, patient_id=patient.id)
    visible = patients.list_patients(doctor_id=doctor.id)
    assert [p.id for p in visible] == [patient.id]
    assert patients.count_patients(doctor_id=doctor.id) == 1


def test_doctor_cannot_see_unrelated_patients(
    users: UserRepository, patients: PatientRepository
) -> None:
    """Another doctor's patient is not in scope."""
    mine = make_user(users, "mine@hospital.org")
    theirs = make_user(users, "theirs@hospital.org")
    make_patient(patients, "MRN-5", doctor_id=theirs.id)
    assert patients.list_patients(doctor_id=mine.id) == []
    assert patients.count_patients(doctor_id=mine.id) == 0


def test_unscoped_listing_returns_every_patient(
    users: UserRepository, patients: PatientRepository
) -> None:
    """Roles with hospital wide visibility pass doctor_id=None."""
    doctor = make_user(users, "any@hospital.org")
    make_patient(patients, "MRN-6", doctor_id=doctor.id)
    make_patient(patients, "MRN-7")
    assert patients.count_patients() == 2


def test_is_visible_to_doctor_matches_the_listing(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """The single record check agrees with the list query."""
    doctor = make_user(users, "check@hospital.org")
    mapped = make_patient(patients, "MRN-8")
    hidden = make_patient(patients, "MRN-9")
    scope.assign(doctor_id=doctor.id, patient_id=mapped.id)
    assert patients.is_visible_to_doctor(mapped.id, doctor.id)
    assert not patients.is_visible_to_doctor(hidden.id, doctor.id)


def test_revoking_a_mapping_removes_visibility(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """Unassigning takes the patient back out of scope immediately."""
    doctor = make_user(users, "revoke@hospital.org")
    patient = make_patient(patients, "MRN-10")
    scope.assign(doctor_id=doctor.id, patient_id=patient.id)
    assert patients.is_visible_to_doctor(patient.id, doctor.id)
    assert scope.unassign(doctor_id=doctor.id, patient_id=patient.id)
    assert not patients.is_visible_to_doctor(patient.id, doctor.id)


# --------------------------------------------------------------------------
# PatientRepository - lookup and search
# --------------------------------------------------------------------------


def test_get_by_mrn_finds_the_record(patients: PatientRepository) -> None:
    """Medical record number is the natural lookup key."""
    created = make_patient(patients, "MRN-11")
    assert patients.get_by_mrn("MRN-11").id == created.id
    assert patients.mrn_exists("MRN-11")
    assert not patients.mrn_exists("MRN-does-not-exist")


def test_search_matches_mrn_and_diagnosis(patients: PatientRepository) -> None:
    """A partial, case insensitive term matches either searchable column."""
    make_patient(patients, "MRN-A100")
    assert len(patients.search("mrn-a1")) == 1
    assert len(patients.search("DIABET")) == 1
    assert patients.search("cardiology") == []


def test_search_cannot_widen_a_doctors_scope(
    users: UserRepository, patients: PatientRepository
) -> None:
    """Searching inside a scope never reveals a patient outside it."""
    doctor = make_user(users, "search@hospital.org")
    make_patient(patients, "MRN-12", doctor_id=doctor.id)
    make_patient(patients, "MRN-13")
    assert len(patients.search("MRN-1", doctor_id=doctor.id)) == 1
    assert len(patients.search("MRN-1")) == 2


# --------------------------------------------------------------------------
# AdmissionRepository
# --------------------------------------------------------------------------


def test_admissions_are_listed_most_recent_first(
    patients: PatientRepository, admissions: AdmissionRepository
) -> None:
    """The timeline reads newest to oldest."""
    patient = make_patient(patients, "MRN-14")
    older = admissions.create(
        patient_id=patient.id, admission_date=date(2023, 1, 1), readmitted="NO"
    )
    recent = admissions.create(
        patient_id=patient.id, admission_date=date(2024, 6, 1), readmitted="<30"
    )
    listed = admissions.list_for_patient(patient.id)
    assert [a.id for a in listed] == [recent.id, older.id]
    assert admissions.count_for_patient(patient.id) == 2


def test_readmission_summary_counts_by_label(
    patients: PatientRepository, admissions: AdmissionRepository
) -> None:
    """Raw dataset labels are preserved and real readmissions are totalled."""
    patient = make_patient(patients, "MRN-15")
    for label in ("NO", "NO", "<30", ">30", None):
        admissions.create(patient_id=patient.id, readmitted=label)
    summary = admissions.readmission_summary(patient.id)
    assert summary["NO"] == 2
    assert summary["<30"] == 1
    assert summary[">30"] == 1
    assert summary["unknown"] == 1
    assert summary["readmitted_total"] == 2


def test_readmission_summary_is_empty_for_a_new_patient(
    patients: PatientRepository, admissions: AdmissionRepository
) -> None:
    """A patient with no admissions reports zero rather than failing."""
    patient = make_patient(patients, "MRN-16")
    assert admissions.readmission_summary(patient.id) == {"readmitted_total": 0}


# --------------------------------------------------------------------------
# DoctorPatientRepository
# --------------------------------------------------------------------------


def test_assign_is_idempotent(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """Repeating an assignment returns the original row instead of raising."""
    doctor = make_user(users, "idem@hospital.org")
    patient = make_patient(patients, "MRN-17")
    first = scope.assign(doctor_id=doctor.id, patient_id=patient.id)
    second = scope.assign(doctor_id=doctor.id, patient_id=patient.id)
    assert first.id == second.id
    assert scope.list_patient_ids_for_doctor(doctor.id) == [patient.id]


def test_unassign_reports_whether_anything_was_removed(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """Revoking a mapping that was never granted is not an error."""
    doctor = make_user(users, "noop@hospital.org")
    patient = make_patient(patients, "MRN-18")
    assert not scope.unassign(doctor_id=doctor.id, patient_id=patient.id)


def test_a_patient_can_be_co_managed(
    users: UserRepository, patients: PatientRepository, scope: DoctorPatientRepository
) -> None:
    """The mapping table exists so several doctors can share one patient."""
    first = make_user(users, "first@hospital.org")
    second = make_user(users, "second@hospital.org")
    patient = make_patient(patients, "MRN-19")
    scope.assign(doctor_id=first.id, patient_id=patient.id)
    scope.assign(doctor_id=second.id, patient_id=patient.id)
    assert sorted(scope.list_doctor_ids_for_patient(patient.id)) == sorted([first.id, second.id])
    assert patients.is_visible_to_doctor(patient.id, first.id)
    assert patients.is_visible_to_doctor(patient.id, second.id)


# --------------------------------------------------------------------------
# BaseRepository behaviour inherited by all four
# --------------------------------------------------------------------------


def test_update_only_touches_the_fields_supplied(users: UserRepository) -> None:
    """A partial update must not blank the columns the caller left out."""
    user = make_user(users, "partial@hospital.org")
    users.update(user, department="Cardiology")
    refreshed = users.get(user.id)
    assert refreshed.department == "Cardiology"
    assert refreshed.full_name == "Partial"
    assert refreshed.email == "partial@hospital.org"


def test_delete_removes_the_row(patients: PatientRepository) -> None:
    """Deleting a patient makes it unreachable by primary key."""
    patient = make_patient(patients, "MRN-20")
    patients.delete(patient)
    assert patients.get(patient.id) is None
