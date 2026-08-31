"""Doctor-Patient Assignments API endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.services.assignment_service import AssignmentService

router = APIRouter(prefix="/assignments", tags=["Doctor-Patient Assignments"])


@router.get(
    "",
    response_model=list[AssignmentResponse],
    summary="List Doctor-Patient Assignments",
    description="List all active doctor-patient assignments in the hospital.",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"))],
)
def list_assignments(
    db: Annotated[Session, Depends(get_db)],
) -> list[AssignmentResponse]:
    service = AssignmentService(db)
    return service.list_assignments()


@router.post(
    "",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign Doctor to Patient",
    description="Assign a doctor to a patient (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def create_assignment(
    payload: AssignmentCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AssignmentResponse:
    service = AssignmentService(db)
    return service.create_assignment(payload, current_user=current_user)


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Doctor-Patient Assignment",
    description="Delete a doctor-patient assignment (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def delete_assignment(
    assignment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = AssignmentService(db)
    service.delete_assignment(assignment_id, current_user=current_user)
