"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.patient import (
    PatientAssignment,
    PatientCreate,
    PatientRead,
)
from app.services.patient_service import (
    assign_patient_to_doctor,
    create_patient_record,
    get_dashboard_patients,
    get_scoped_patients,
)

router = APIRouter()


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[PatientRead]:
    """Return the patients the caller is allowed to see based on their role."""
    patients = get_scoped_patients(db=db, user=user)
    return [PatientRead.model_validate(patient) for patient in patients]


@router.get("/dashboard", summary="List patients with latest admission risk")
def dashboard_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[dict]:
    return get_dashboard_patients(db=db, user=user)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a new patient record."""
    patient = create_patient_record(db=db, payload=payload)
    return PatientRead.model_validate(patient)


@router.patch(
    "/{patient_id}/assign",
    summary="Assign a patient to a doctor",
)
def assign_patient(
    patient_id: int,
    payload: PatientAssignment,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> dict:
    """Assign an existing patient to a doctor."""

    patient = assign_patient_to_doctor(
        db=db,
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
    )

    return {
        "message": "Patient assigned successfully",
        "patient_id": patient.id,
        "assigned_doctor_id": patient.assigned_doctor_id,
    }


@router.get("/anonymised", summary="Anonymised patient cohort for researchers")
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[dict[str, str]]:
    """Return a de-identified cohort (Milestone 3 feature)."""
    return []
