"""patient service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.
Scope rules mirror the access matrix in the project brief, section 4.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate


def list_patients_for(db: Session, user: CurrentUser) -> list[Patient]:
    """Return the patients the caller is allowed to see, scoped by role.

    - doctor          -> only patients assigned to them
    - hospital_admin  -> hospital wide, read only
    - system_admin    -> everything
    Researchers are rejected before this is called - see the endpoint.
    """
    if user.role is Role.DOCTOR:
        # The JWT subject is the doctor's email; look up their numeric id
        # once so we can filter on assigned_doctor_id.
        doctor_id = db.execute(
            select(User.id).where(User.email == user.subject)
        ).scalar_one_or_none()
        if doctor_id is None:
            return []
        stmt = select(Patient).where(Patient.assigned_doctor_id == doctor_id)
    else:
        # hospital_admin and system_admin see every patient at this stage.
        stmt = select(Patient)

    return list(db.execute(stmt).scalars().all())


def create_patient(db: Session, payload: PatientCreate, actor: CurrentUser) -> Patient:
    """Persist a new patient record and write an audit log entry."""
    patient = Patient(
        medical_record_number=payload.medical_record_number,
        age_group=payload.age_group,
        gender=payload.gender,
        race=payload.race,
        primary_diagnosis=payload.primary_diagnosis,
        assigned_doctor_id=payload.assigned_doctor_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    db.add(
        AuditLog(
            actor_role=str(actor.role),
            action="patient_create",
            resource=f"patient:{patient.id}",
            outcome="success",
        )
    )
    db.commit()
    return patient
