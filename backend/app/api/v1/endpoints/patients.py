"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import create_patient, list_patients_for

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
      - researcher      -> anonymised records only, via /patients/anonymised
      - system_admin    -> everything
    """
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )
    return list_patients_for(db, user)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_new_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a patient record."""
    return create_patient(db, payload, user)


@router.get("/anonymised", summary="Anonymised patient cohort for researchers")
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[dict[str, str]]:
    """Return a de-identified cohort.

    TODO(milestone-3): pseudonymise the MRN and strip every direct identifier
    using app/utils/anonymisation.py.
    """
    return []
