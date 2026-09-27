"""Patient data management endpoints - Module 2."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user, require_permission
from app.api.errors import cohort_too_small
from app.api.filters import research_cohort_filter
from app.core.config import settings
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.schemas.analytics import ResearchCohortFilter
from app.schemas.patient import PatientAnonymised, PatientCreate, PatientRead, PatientUpdate
from app.services.patient_service import (
    CohortTooSmallError,
    DuplicateMedicalRecordNumberError,
    PatientNotFoundError,
    PatientService,
    UnknownFieldError,
)
from app.utils.anonymisation import anonymise_patient

router = APIRouter()

_write_patients = require_permission(Permission.PATIENT_WRITE)


def _not_found(patient_id: int) -> HTTPException:
    """Build the 404 used for both a missing and an out of scope patient.

    docs/03-api asks for a documented reason when 404 stands in for an
    authorisation failure. The reason is that 403 would confirm the patient
    exists, which discloses another clinician's caseload to a doctor who is not
    permitted to see it.
    """
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No patient with id {patient_id}"
    )


@router.get("", response_model=list[PatientRead], summary="List patients visible to the caller")
def list_patients(
    response: Response,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(
        default=None,
        min_length=1,
        max_length=64,
        description="Search medical record number or primary diagnosis",
    ),
    user: CurrentUser = Depends(get_current_active_user),
    db: Session = Depends(get_db),
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

    rows, total = PatientService(db).list_patients(user, limit=limit, offset=offset, query=q)
    response.headers["X-Total-Count"] = str(total)
    return [PatientRead.model_validate(row) for row in rows]


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    user: CurrentUser = Depends(_write_patients),
    db: Session = Depends(get_db),
) -> PatientRead:
    """Create a patient record."""
    try:
        created = PatientService(db).create_patient(
            user,
            medical_record_number=payload.medical_record_number,
            age_group=payload.age_group,
            gender=payload.gender,
            race=payload.race,
            primary_diagnosis=payload.primary_diagnosis,
            assigned_doctor_id=payload.assigned_doctor_id,
        )
    except DuplicateMedicalRecordNumberError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That medical record number already exists",
        ) from exc
    return PatientRead.model_validate(created)


@router.get(
    "/anonymised",
    response_model=list[PatientAnonymised],
    summary="Anonymised patient cohort for researchers",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Role lacks patient:read_anonymized"},
        422: {"description": "Invalid filter, or cohort_too_small"},
    },
)
def list_anonymised_patients(
    response: Response,
    filters: ResearchCohortFilter = Depends(research_cohort_filter),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    user: CurrentUser = Depends(require_permission(Permission.PATIENT_READ_ANONYMIZED)),
    db: Session = Depends(get_db),
) -> list[PatientAnonymised]:
    """Return a page of a de-identified cohort: no MRN, no name, a pseudonymous id.

    422 cohort_too_small when the *filtered* cohort - not the page - is
    smaller than the configured minimum: an anonymised export over a handful
    of patients can still re-identify someone by elimination. X-Total-Count
    carries the filtered cohort size.
    """
    try:
        patients = PatientService(db).list_for_research(user, filters=filters)
    except CohortTooSmallError as exc:
        raise cohort_too_small(exc) from exc
    response.headers["X-Total-Count"] = str(len(patients))
    return [
        PatientAnonymised(**anonymise_patient(patient, settings.ANONYMISATION_SALT))
        for patient in patients[offset : offset + limit]
    ]


@router.get("/{patient_id}", response_model=PatientRead, summary="Read one patient")
def get_patient(
    patient_id: int,
    user: CurrentUser = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PatientRead:
    """Return a single patient record the caller is permitted to see."""
    if user.role is Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )
    try:
        record = PatientService(db).get_patient(user, patient_id)
    except PatientNotFoundError as exc:
        raise _not_found(patient_id) from exc
    return PatientRead.model_validate(record)


@router.patch("/{patient_id}", response_model=PatientRead, summary="Update a patient")
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    user: CurrentUser = Depends(_write_patients),
    db: Session = Depends(get_db),
) -> PatientRead:
    """Apply a partial update. Only the fields present in the body are changed."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update",
        )
    try:
        updated = PatientService(db).update_patient(user, patient_id, changes)
    except PatientNotFoundError as exc:
        raise _not_found(patient_id) from exc
    except UnknownFieldError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown field: {exc}"
        ) from exc
    return PatientRead.model_validate(updated)
