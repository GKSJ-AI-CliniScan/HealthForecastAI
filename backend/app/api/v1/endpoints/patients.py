"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.schemas.patient import PatientCreate, PatientRead

router = APIRouter()


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(user: CurrentUser = Depends(get_current_user)) -> list[PatientRead]:
    """Return the patients the caller is allowed to see.

    Scope rules from the access matrix:
      - doctor          -> only patients assigned to them
      - hospital_admin  -> hospital wide, read only
      - researcher      -> anonymised records only
      - system_admin    -> everything

    TODO(milestone-1): implement the scoping in app/services/patient_service.py.
    """
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )
    return []


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a patient record.

    TODO(milestone-1): persist to PostgreSQL and emit an audit log entry.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Patient creation is not implemented yet - see TODO(milestone-1)",
    )


@router.get("/anonymised", summary="Anonymised patient cohort for researchers")
def list_anonymised_patients(
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
) -> list[dict[str, str]]:
    """Return a de-identified cohort.

    TODO(milestone-3): pseudonymise the MRN and strip every direct identifier.
    """
    return []
