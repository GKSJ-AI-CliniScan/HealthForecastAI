"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import get_patients_for_user

router = APIRouter()


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user)
) -> list[PatientRead]:
    """Return the patients the caller is allowed to see based on RBAC scope."""
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )
    return get_patients_for_user(db, user)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a new patient record in PostgreSQL."""
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


@router.get("/anonymised", summary="Anonymised patient cohort for researchers")
def list_anonymised_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[dict[str, object]]:
    """Return a de-identified patient cohort (stripping PII / MRN)."""
    patients = db.query(Patient).all()
    return [
        {
            "id": p.id,
            "age_group": p.age_group,
            "gender": p.gender,
            "race": p.race,
            "primary_diagnosis": p.primary_diagnosis,
        }
        for p in patients
    ]
