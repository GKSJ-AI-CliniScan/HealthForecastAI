
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import get_visible_patients

router = APIRouter()


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[PatientRead]:
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
    return get_visible_patients(db, user)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a patient record."""
    existing = (
        db.query(Patient)
        .filter(Patient.medical_record_number == payload.medical_record_number)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this medical record number already exists",
        )

    new_patient = Patient(
        medical_record_number=payload.medical_record_number,
        age_group=payload.age_group,
        gender=payload.gender,
        race=payload.race,
        primary_diagnosis=payload.primary_diagnosis,
        assigned_doctor_id=payload.assigned_doctor_id,
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    db.add(
        AuditLog(
            actor_id=int(user.subject) if user.subject.isdigit() else None,
            actor_role=str(user.role),
            action="patient:create",
            resource=new_patient.medical_record_number,
            outcome="success",
        )
    )
    db.commit()

    return new_patient


@router.get("/anonymised", summary="Anonymised patient cohort for researchers")
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[dict[str, str]]:
    """Return a de-identified cohort.

    TODO(milestone-3): pseudonymise the MRN and strip every direct identifier.
    """
    return []
