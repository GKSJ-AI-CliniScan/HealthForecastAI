"""Admission management endpoints - Module 2.

Mounted under /patients/{patient_id}/admissions because an admission has no
meaning apart from its patient, and nesting makes the scope inheritance explicit:
if the caller cannot read the patient, they cannot reach the admissions either.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.schemas.admission import (
    AdmissionCreate,
    AdmissionRead,
    AdmissionUpdate,
    ReadmissionSummary,
)
from app.services.admission_service import (
    AdmissionNotFoundError,
    AdmissionService,
    UnknownFieldError,
)
from app.services.patient_service import PatientNotFoundError

router = APIRouter()

_write_patients = require_permission(Permission.PATIENT_WRITE)


def _patient_not_found(patient_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No patient with id {patient_id}"
    )


def _admission_not_found(admission_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No admission with id {admission_id}"
    )


def _reject_researchers(user: CurrentUser) -> None:
    """Researchers get aggregated data only, never an identifiable timeline."""
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use the anonymised endpoints",
        )


@router.get(
    "/{patient_id}/admissions",
    response_model=list[AdmissionRead],
    summary="Admission and discharge timeline for a patient",
)
def list_admissions(
    patient_id: int,
    response: Response,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[AdmissionRead]:
    """Return the patient's admissions, most recent first."""
    _reject_researchers(user)
    try:
        rows, total = AdmissionService(db).list_for_patient(
            user, patient_id, limit=limit, offset=offset
        )
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    response.headers["X-Total-Count"] = str(total)
    return [AdmissionRead.model_validate(row) for row in rows]


@router.post(
    "/{patient_id}/admissions",
    response_model=AdmissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Record an admission",
)
def create_admission(
    patient_id: int,
    payload: AdmissionCreate,
    user: CurrentUser = Depends(_write_patients),
    db: Session = Depends(get_db),
) -> AdmissionRead:
    """Record a new admission for a patient."""
    try:
        created = AdmissionService(db).create_admission(
            user, patient_id, payload.model_dump(exclude_unset=True)
        )
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    return AdmissionRead.model_validate(created)


@router.get(
    "/{patient_id}/admissions/readmissions",
    response_model=ReadmissionSummary,
    summary="Readmission tracking for a patient",
)
def readmission_summary(
    patient_id: int,
    user: CurrentUser = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReadmissionSummary:
    """Return how many of the patient's admissions ended in a readmission.

    The source dataset's own labels are preserved in by_label so the readmission
    window is not lost, which the Milestone 2 forecasting work depends on.
    """
    _reject_researchers(user)
    try:
        summary = AdmissionService(db).readmission_summary(user, patient_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    return ReadmissionSummary.model_validate(summary)


@router.get(
    "/{patient_id}/admissions/{admission_id}",
    response_model=AdmissionRead,
    summary="Read one admission",
)
def get_admission(
    patient_id: int,
    admission_id: int,
    user: CurrentUser = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> AdmissionRead:
    """Return a single admission belonging to this patient."""
    _reject_researchers(user)
    try:
        record = AdmissionService(db).get_admission(user, patient_id, admission_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    except AdmissionNotFoundError as exc:
        raise _admission_not_found(admission_id) from exc
    return AdmissionRead.model_validate(record)


@router.patch(
    "/{patient_id}/admissions/{admission_id}",
    response_model=AdmissionRead,
    summary="Update an admission",
)
def update_admission(
    patient_id: int,
    admission_id: int,
    payload: AdmissionUpdate,
    user: CurrentUser = Depends(_write_patients),
    db: Session = Depends(get_db),
) -> AdmissionRead:
    """Apply a partial update. Only the fields present in the body are changed."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update",
        )
    try:
        updated = AdmissionService(db).update_admission(user, patient_id, admission_id, changes)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    except AdmissionNotFoundError as exc:
        raise _admission_not_found(admission_id) from exc
    except UnknownFieldError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown field: {exc}"
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return AdmissionRead.model_validate(updated)
