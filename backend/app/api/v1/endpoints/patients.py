"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.schemas.patient import PatientCreate, PatientRead
from app.services.patient_service import (
    create_patient as create_patient_service,
)
from app.services.patient_service import (
    list_patients as list_patients_service,
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
    """Return patients visible to the caller according to their role."""

    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )

    patients = list_patients_service(
        db,
        user_id=int(user.subject),
        role=user.role,
    )

    return [PatientRead.model_validate(item) for item in patients]


@router.post(
    "",
    response_model=PatientRead,
    status_code=status.HTTP_201_CREATED,
)
def create_patient(
    payload: PatientCreate,
    user: CurrentUser = Depends(
        require_permission(Permission.PATIENT_WRITE)
    ),
    db: Session = Depends(get_db),
) -> PatientRead:
    """Create a patient record."""

    try:
        created_patient = create_patient_service(
            db,
            payload,
            actor_id=int(user.subject),
            actor_role=user.role,
        )

        return PatientRead.model_validate(created_patient)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/anonymised",
    summary="Anonymised patient cohort for researchers",
)
def list_anonymised_patients(
    user: CurrentUser = Depends(
        require_permission(Permission.PATIENT_READ_ANONYMIZED)
    ),
) -> list[dict[str, str]]:
    """Return a de-identified cohort.

    Full anonymisation is scheduled for Milestone 3.
    """

    return []
