"""Patient business logic."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.patient import Patient


def list_patients_for_user(
    db: Session,
    user_id: int,
    role: Role,
) -> list[Patient]:
    """Return patients visible to the current caller."""

    stmt = select(Patient)

    if role is Role.DOCTOR:
        stmt = stmt.where(Patient.assigned_doctor_id == user_id)

    elif role is Role.HOSPITAL_ADMIN or role is Role.SYSTEM_ADMIN:
        pass

    else:
        return []

    return list(db.scalars(stmt.order_by(Patient.id)).all())


def create_patient(
    db: Session,
    *,
    medical_record_number: str,
    age_group: str | None,
    gender: str | None,
    race: str | None,
    primary_diagnosis: str | None,
    assigned_doctor_id: int | None,
    actor_id: int,
    actor_role: Role,
) -> Patient:
    """Create a patient and record an audit event."""

    patient = Patient(
        medical_record_number=medical_record_number,
        age_group=age_group,
        gender=gender,
        race=race,
        primary_diagnosis=primary_diagnosis,
        assigned_doctor_id=assigned_doctor_id,
    )

    db.add(patient)
    db.flush()

    audit = AuditLog(
        actor_id=actor_id,
        actor_role=str(actor_role),
        action="patient.create",
        resource=f"patient:{patient.id}",
        outcome="success",
    )

    db.add(audit)
    db.commit()
    db.refresh(patient)

    return patient
