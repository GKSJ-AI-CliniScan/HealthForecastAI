"""Hospital admission endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.admission import (
    AdmissionCreate,
    AdmissionRead,
)
from app.services.admission_service import create_admission

router = APIRouter()


@router.post(
    "",
    response_model=AdmissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an admission",
)
def create_admission_endpoint(
    payload: AdmissionCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_WRITE)),
) -> AdmissionRead:
    """Create a hospital admission for a patient."""

    try:
        admission = create_admission(
            db,
            payload,
        )

        return AdmissionRead.model_validate(admission)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
