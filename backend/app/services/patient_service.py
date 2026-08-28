"""Patient service - business logic layer.

Handles patient record operations with role-based data scoping.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.models.patient import Patient
from app.schemas.patient import PatientCreate


def get_scoped_patients(db: Session, user: CurrentUser) -> list[Patient]:
    """Return patient records filtered by the caller's role permissions.

    Scoping rules:
      - DOCTOR: Only patients explicitly assigned to the doctor.
      - HOSPITAL_ADMIN & SYSTEM_ADMIN: Hospital-wide patient access.
      - RESEARCHER: Must not access direct patient records.
    """
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )

    query = db.query(Patient)

    if user.role is Role.DOCTOR:
        try:
            doctor_id = int(user.subject)
            query = query.filter(Patient.assigned_doctor_id == doctor_id)
        except (ValueError, TypeError):
            return []

    return query.all()


def create_patient_record(db: Session, payload: PatientCreate) -> Patient:
    """Create a new patient record in PostgreSQL."""
    existing = (
        db.query(Patient)
        .filter(Patient.medical_record_number == payload.medical_record_number)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A patient with this medical record number already exists.",
        )

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
    return patient