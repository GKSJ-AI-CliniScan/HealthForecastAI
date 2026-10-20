"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.schemas.patient import PatientAnonymised, PatientCreate, PatientRead
from app.services import auth_service, patient_service

router = APIRouter()


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(user: CurrentUser = Depends(get_current_user)) -> list[PatientRead]:
    """Return the patients the caller is allowed to see.

    Scope rules from the access matrix:
      - doctor          -> only patients assigned to them
      - hospital_admin  -> hospital wide, read only
      - researcher      -> anonymised records only
      - system_admin    -> everything
    """
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )
    return [PatientRead.model_validate(p) for p in patient_service.visible_patients(user)]


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a patient record and write an audit log entry."""
    try:
        record = patient_service.create_patient(
            medical_record_number=payload.medical_record_number,
            age_group=payload.age_group,
            gender=payload.gender,
            race=payload.race,
            primary_diagnosis=payload.primary_diagnosis,
            assigned_doctor_id=payload.assigned_doctor_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    auth_service.record_audit(f"user:{user.subject}", f"create_patient:{record.id}", "success")
    return PatientRead.model_validate(record)


@router.get(
    "/anonymised",
    response_model=list[PatientAnonymised],
    summary="Anonymised patient cohort for researchers",
)
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[PatientAnonymised]:
    """Return a de-identified cohort: pseudonymised ID, no MRN, no direct identifiers."""
    return [PatientAnonymised(**row) for row in patient_service.anonymised_cohort()]


@router.get("/{patient_id}", response_model=PatientRead, summary="One patient")
def read_patient(patient_id: int, user: CurrentUser = Depends(get_current_user)) -> PatientRead:
    """Return one patient if the caller may see them, otherwise 404."""
    record = patient_service.get_visible_patient(user, patient_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return PatientRead.model_validate(record)
