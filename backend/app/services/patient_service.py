"""Patient management business logic."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate


def list_patients(
    db: Session,
    *,
    user_id: int,
    role: Role,
) -> list[Patient]:
    """Return patients visible to the authenticated caller."""

    statement = select(Patient).order_by(Patient.id)

    if role is Role.DOCTOR:
        statement = statement.where(Patient.assigned_doctor_id == user_id)

    elif role is Role.HOSPITAL_ADMIN:
        # Hospital-wide access in the current schema.
        pass

    elif role is Role.SYSTEM_ADMIN:
        # System administrators can see everything.
        pass

    else:
        # Researchers must use /patients/anonymised.
        return []

    return list(db.scalars(statement).all())


def create_patient(
    db: Session,
    payload: PatientCreate,
    *,
    actor_id: int,
    actor_role: Role,
) -> Patient:
    """Create a patient and record the action."""

    if payload.assigned_doctor_id is not None:
        doctor = db.get(User, payload.assigned_doctor_id)

        if doctor is None:
            raise ValueError("Assigned doctor does not exist")

        if doctor.role != Role.DOCTOR:
            raise ValueError("assigned_doctor_id must reference a doctor")

        if not doctor.is_active:
            raise ValueError("Assigned doctor is inactive")

    existing_patient = db.scalar(
        select(Patient).where(Patient.medical_record_number == payload.medical_record_number)
    )

    if existing_patient is not None:
        raise ValueError("A patient with this medical record number already exists")

    patient = Patient(
        medical_record_number=payload.medical_record_number,
        age_group=payload.age_group,
        gender=payload.gender,
        race=payload.race,
        primary_diagnosis=payload.primary_diagnosis,
        assigned_doctor_id=payload.assigned_doctor_id,
    )

    db.add(patient)
    db.flush()

    db.add(
        AuditLog(
            actor_id=actor_id,
            actor_role=str(actor_role),
            action="patient.create",
            resource=str(patient.id),
            outcome="success",
        )
    )

    db.commit()
    db.refresh(patient)

    return patient
