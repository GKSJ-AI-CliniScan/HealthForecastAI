"""Patient data management endpoints - Module 1."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import (
    create_patient,
    list_patients_for_user,
)

router = APIRouter()


@router.get(
    "",
    response_model=list[PatientRead],
    summary="List patients visible to the caller",
)
def list_patients(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PatientRead]:
    """Return only patients the caller is allowed to see."""

    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )

    return list_patients_for_user(
        db=db,
        user_id=int(user.subject),
        role=user.role,
    )


@router.post(
    "",
    response_model=PatientRead,
    status_code=status.HTTP_201_CREATED,
)
def create_patient_endpoint(
    payload: PatientCreate,
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
    db: Session = Depends(get_db),
) -> PatientRead:
    """Create a patient record."""

    # Check that the assigned doctor exists and is actually a doctor.
    if payload.assigned_doctor_id is not None:
        from app.models.user import User

        doctor = db.scalar(
            select(User).where(
                User.id == payload.assigned_doctor_id,
                User.role == Role.DOCTOR,
            )
        )

        if doctor is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned doctor does not exist",
            )

    # Prevent duplicate medical record numbers.
    existing = db.scalar(
        select(Patient).where(Patient.medical_record_number == payload.medical_record_number)
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Medical record number already exists",
        )

    return create_patient(
        db=db,
        medical_record_number=payload.medical_record_number,
        age_group=payload.age_group,
        gender=payload.gender,
        race=payload.race,
        primary_diagnosis=payload.primary_diagnosis,
        assigned_doctor_id=payload.assigned_doctor_id,
        actor_id=int(user.subject),
        actor_role=user.role,
    )


@router.get(
    "/anonymised",
    summary="Anonymised patient cohort for researchers",
)
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
    db: Session = Depends(get_db),
) -> list[dict[str, str | None]]:
    """Return a researcher-safe patient view."""

    patients = list(db.scalars(select(Patient).order_by(Patient.id)).all())

    return [
        {
            "pseudo_id": f"PAT-{patient.id:06d}",
            "age_group": patient.age_group,
            "gender": patient.gender,
            "primary_diagnosis": patient.primary_diagnosis,
        }
        for patient in patients
    ]
