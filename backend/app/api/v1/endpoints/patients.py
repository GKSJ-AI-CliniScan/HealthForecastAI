"""Patient data management endpoints - Module 2.

Scoping follows the access matrix in section 4 of the brief:
  doctor         -> only patients assigned to them
  hospital_admin -> hospital wide, read only
  researcher     -> anonymised records only, via /anonymised
  system_admin   -> everything
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.user import User
from app.schemas.patient import (
    AdmissionRead,
    AnonymisedPage,
    PatientCreate,
    PatientDetail,
    PatientPage,
    PatientRead,
    PatientUpdate,
)
from app.services import patient_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CanWritePatients = Annotated[User, Depends(require_permission(Permission.PATIENT_WRITE))]
CanReadAnonymised = Annotated[User, Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED))]


@router.get("", response_model=PatientPage, summary="List patients visible to the caller")
def list_patients(
    user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, max_length=100),
) -> PatientPage:
    """Return the page of patients the caller is allowed to see."""
    if user.role == Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )

    rows, total = patient_service.list_patients(db, user, limit=limit, offset=offset, search=search)
    return PatientPage(
        items=[PatientRead.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/anonymised", response_model=AnonymisedPage, summary="Anonymised cohort")
def list_anonymised_patients(
    user: CanReadAnonymised,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AnonymisedPage:
    """Return a de-identified cohort for research use.

    The MRN is replaced by a salted, non-reversible pseudonym and every direct
    identifier is dropped before the record leaves this function.
    """
    rows, total = patient_service.list_patients(db, user, limit=limit, offset=offset)
    return AnonymisedPage(
        items=[patient_service.to_anonymised(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "", response_model=PatientRead, status_code=status.HTTP_201_CREATED, summary="Create a patient"
)
def create_patient(payload: PatientCreate, user: CanWritePatients, db: DbSession) -> PatientRead:
    """Create a patient record and write an audit log entry."""
    try:
        patient = patient_service.create_patient(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return PatientRead.model_validate(patient)


@router.get("/{patient_id}", response_model=PatientDetail, summary="Patient with history")
def get_patient(patient_id: int, user: CurrentUser, db: DbSession) -> PatientDetail:
    """Return one patient and their admission history.

    A patient outside the caller's scope returns 404, not 403: telling a doctor
    that a record exists but is not theirs is itself a disclosure.
    """
    if user.role == Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )

    patient = patient_service.get_patient(db, user, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    admissions = patient_service.list_admissions(db, user, patient_id) or []
    detail = PatientDetail.model_validate(patient)
    detail.admissions = [AdmissionRead.model_validate(row) for row in admissions]
    return detail


@router.patch("/{patient_id}", response_model=PatientRead, summary="Update a patient")
def update_patient(
    patient_id: int, payload: PatientUpdate, user: CanWritePatients, db: DbSession
) -> PatientRead:
    """Apply a partial update to a patient record."""
    patient = patient_service.update_patient(db, user, patient_id, payload)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return PatientRead.model_validate(patient)


@router.get(
    "/{patient_id}/admissions",
    response_model=list[AdmissionRead],
    summary="Admission history for a patient",
)
def list_patient_admissions(
    patient_id: int,
    user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[AdmissionRead]:
    """Return a patient's admission history, most recent first."""
    admissions = patient_service.list_admissions(db, user, patient_id, limit=limit)
    if admissions is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return [AdmissionRead.model_validate(row) for row in admissions]
