"""Patient management endpoints.

Each route is guarded by a permission rather than a role name, so the access
matrix in ``app.core.rbac`` stays the single place where policy is defined.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    VerifiedUser,
    get_db,
    require_any_verified_permission,
    require_verified_permission,
)
from app.core.rbac import Permission
from app.models.admission import Admission
from app.models.patient import Patient
from app.schemas.patient import (
    DashboardStats,
    PatientAnonymised,
    PatientCreate,
    PatientDetail,
    PatientRead,
)
from app.services import patient_service

router = APIRouter()

READ_PATIENTS = (Permission.PATIENT_READ_ASSIGNED, Permission.PATIENT_READ_ALL)


@router.get("/stats", response_model=DashboardStats, summary="Dashboard headline metrics")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(require_any_verified_permission(*READ_PATIENTS)),
) -> DashboardStats:
    """Return counts scoped to what the caller is allowed to see."""
    return DashboardStats(**patient_service.dashboard_stats(db, caller))


@router.get("", response_model=list[PatientRead], summary="List patients in scope")
def list_patients(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(require_any_verified_permission(*READ_PATIENTS)),
) -> list[PatientRead]:
    """Return a page of patients. Doctors see only their own assignments."""
    patients = patient_service.list_patients(db, caller, limit=limit, offset=offset)
    return [PatientRead.model_validate(patient) for patient in patients]


@router.get(
    "/anonymised",
    response_model=list[PatientAnonymised],
    summary="De-identified cohort for research",
)
def list_anonymised(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _caller: VerifiedUser = Depends(
        require_verified_permission(Permission.PATIENT_READ_ANONYMIZED)
    ),
) -> list[PatientAnonymised]:
    """Return patients with direct identifiers stripped.

    Declared before the ``/{patient_id}`` route so that the literal path is not
    swallowed by the integer parameter.
    """
    rows = patient_service.list_anonymised(db, limit=limit, offset=offset)
    return [PatientAnonymised(**row) for row in rows]


@router.get("/{patient_id}", response_model=PatientDetail, summary="One patient with history")
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(require_any_verified_permission(*READ_PATIENTS)),
) -> PatientDetail:
    """Return a patient and their encounters, subject to the caller's scope."""
    try:
        patient = patient_service.get_patient(db, caller, patient_id)
    except patient_service.PatientNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    admissions = (
        db.query(Admission).filter(Admission.patient_id == patient.id).order_by(Admission.id).all()
    )
    detail = PatientDetail.model_validate(patient)
    detail.admissions = list(admissions)
    return detail


@router.post(
    "",
    response_model=PatientRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a patient record",
)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    _caller: VerifiedUser = Depends(require_verified_permission(Permission.PATIENT_WRITE)),
) -> PatientRead:
    """Create a patient record."""
    existing = (
        db.query(Patient)
        .filter(Patient.medical_record_number == payload.medical_record_number)
        .one_or_none()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Patient {payload.medical_record_number} already exists",
        )

    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientRead.model_validate(patient)
