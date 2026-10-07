"""Patient data management business logic.

Milestone 1. The scoping rules here are the access matrix from section 4 of the
brief, applied at the query level rather than by filtering after the fact - a
row a caller may not see is never loaded.
"""

from __future__ import annotations

import hashlib

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientUpdate
from app.services.auth_service import record_audit


class PatientAccessError(PermissionError):
    """Raised when a caller asks for a patient outside their scope."""


def pseudonymise(medical_record_number: str) -> str:
    """Return a stable, non-reversible pseudonym for a researcher-facing record.

    Salted with SECRET_KEY so the mapping cannot be rebuilt from the output
    alone, and stable so a researcher can follow one subject across queries.
    """
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:{medical_record_number}".encode()).hexdigest()
    return f"PT-{digest[:16].upper()}"


def scoped_query(actor: User) -> Select[tuple[Patient]]:
    """Return a patient SELECT already narrowed to what the caller may see."""
    stmt = select(Patient)

    if actor.role == Role.DOCTOR:
        # "Assigned patients only" - the doctor's own caseload, nothing else.
        return stmt.where(Patient.assigned_doctor_id == actor.id)

    if actor.role in (Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN, Role.RESEARCHER):
        # Hospital-wide. The researcher's view is de-identified by the caller
        # before it leaves the API - see to_anonymised().
        return stmt

    # Unknown role: deny by default rather than leaking on a typo.
    return stmt.where(Patient.id.is_(None))


def list_patients(
    db: Session,
    actor: User,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> tuple[list[Patient], int]:
    """Return a page of patients the caller may see, plus the total count."""
    stmt = scoped_query(actor)

    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            func.lower(Patient.medical_record_number).like(term)
            | func.lower(func.coalesce(Patient.primary_diagnosis, "")).like(term)
        )

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    rows = db.execute(stmt.order_by(Patient.id).limit(limit).offset(offset)).scalars().all()

    return list(rows), total


def get_patient(db: Session, actor: User, patient_id: int) -> Patient | None:
    """Return one patient if the caller is allowed to see them."""
    stmt = scoped_query(actor).where(Patient.id == patient_id)
    return db.execute(stmt).scalar_one_or_none()


def create_patient(db: Session, actor: User, payload: PatientCreate) -> Patient:
    """Create a patient record. Raises ValueError when the MRN is taken."""
    existing = db.execute(
        select(Patient).where(Patient.medical_record_number == payload.medical_record_number)
    ).scalar_one_or_none()
    if existing is not None:
        raise ValueError(f"A patient with MRN {payload.medical_record_number} already exists")

    values = payload.model_dump()
    if actor.role == Role.DOCTOR:
        # A doctor can only create patients onto their own caseload. Without
        # this a doctor could assign a new record to someone else and step
        # outside the scope the access matrix gives them.
        values["assigned_doctor_id"] = actor.id

    patient = Patient(**values)
    db.add(patient)
    db.flush()

    record_audit(db, "patient.create", actor.id, actor.role, f"patient:{patient.id}")
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(
    db: Session, actor: User, patient_id: int, payload: PatientUpdate
) -> Patient | None:
    """Apply a partial update to a patient the caller may see."""
    patient = get_patient(db, actor, patient_id)
    if patient is None:
        return None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    record_audit(db, "patient.update", actor.id, actor.role, f"patient:{patient_id}")
    db.commit()
    db.refresh(patient)
    return patient


def list_admissions(
    db: Session, actor: User, patient_id: int, limit: int = 50
) -> list[Admission] | None:
    """Return a patient's admission history, or None when out of scope."""
    if get_patient(db, actor, patient_id) is None:
        return None

    stmt = (
        select(Admission)
        .where(Admission.patient_id == patient_id)
        .order_by(Admission.admission_date.desc().nullslast(), Admission.id.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def to_anonymised(patient: Patient) -> dict[str, str | None]:
    """Strip every direct identifier before a record reaches a researcher."""
    return {
        "pseudo_id": pseudonymise(patient.medical_record_number),
        "age_group": patient.age_group,
        "gender": patient.gender,
        "primary_diagnosis": patient.primary_diagnosis,
    }
