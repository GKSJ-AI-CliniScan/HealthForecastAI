"""Patient data access with role-aware row scoping.

Permission guards decide whether a caller may reach an endpoint at all. This
module decides which rows they see once they are inside, which is the part that
keeps a doctor from reading another ward's patients through a valid token.
"""

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Query, Session

from app.api.deps import VerifiedUser
from app.core.rbac import Permission, Role, has_permission
from app.models.admission import Admission
from app.models.patient import Patient

# Researchers never see these columns, whatever the row scope allows.
IDENTIFYING_FIELDS = ("medical_record_number", "assigned_doctor_id")


class PatientNotFoundError(Exception):
    """Raised when a patient does not exist or is outside the caller's scope."""


def scope_query(query: Query[Any], caller: VerifiedUser) -> Query[Any]:
    """Restrict a patient query to the rows the caller is allowed to see.

    A doctor is limited to their own assignments. Hospital admins, researchers
    and system admins read across the hospital, so the query is returned intact.
    """
    if caller.role is Role.DOCTOR:
        return query.filter(Patient.assigned_doctor_id == caller.id)
    return query


def list_patients(
    db: Session, caller: VerifiedUser, limit: int = 50, offset: int = 0
) -> list[Patient]:
    """Return a page of patients visible to the caller."""
    query = scope_query(db.query(Patient), caller)
    return query.order_by(Patient.id).offset(offset).limit(limit).all()


def get_patient(db: Session, caller: VerifiedUser, patient_id: int) -> Patient:
    """Return one patient, or raise when it is missing or out of scope.

    Out-of-scope rows raise the same error as missing ones. Returning 403 for a
    patient that exists but belongs to another doctor would confirm that the
    record exists, which is itself a small disclosure.
    """
    query = scope_query(db.query(Patient).filter(Patient.id == patient_id), caller)
    patient = query.one_or_none()
    if patient is None:
        raise PatientNotFoundError(f"No patient with id {patient_id} in your scope")
    return patient


def anonymise(patient: Patient) -> dict[str, Any]:
    """Return a research view of a patient with direct identifiers removed."""
    return {
        "cohort_id": f"P{patient.id:06d}",
        "age_group": patient.age_group,
        "gender": patient.gender,
        "race": patient.race,
        "primary_diagnosis": patient.primary_diagnosis,
    }


def list_anonymised(db: Session, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    """Return a de-identified cohort for research use."""
    patients = db.query(Patient).order_by(Patient.id).offset(offset).limit(limit).all()
    return [anonymise(patient) for patient in patients]


def dashboard_stats(db: Session, caller: VerifiedUser) -> dict[str, Any]:
    """Compute the headline numbers shown on the dashboard.

    The counts respect the caller's row scope, so a doctor's dashboard reflects
    their own caseload rather than the whole hospital.
    """
    patient_query = scope_query(db.query(Patient), caller)
    total_patients = patient_query.count()

    visible_ids = [row.id for row in patient_query.with_entities(Patient.id).all()]
    admission_query = db.query(Admission).filter(Admission.patient_id.in_(visible_ids or [-1]))

    total_admissions = admission_query.count()
    readmitted_30d = admission_query.filter(Admission.readmitted_within_30.is_(True)).count()
    average_stay = (
        admission_query.with_entities(func.avg(Admission.time_in_hospital)).scalar() or 0.0
    )

    rate = (readmitted_30d / total_admissions * 100) if total_admissions else 0.0

    return {
        "scope": "assigned" if caller.role is Role.DOCTOR else "hospital",
        "total_patients": total_patients,
        "total_admissions": total_admissions,
        "readmitted_within_30_days": readmitted_30d,
        "readmission_rate_percent": round(rate, 2),
        "average_length_of_stay_days": round(float(average_stay), 2),
        "can_export": has_permission(caller.role, Permission.ANALYTICS_EXPORT),
    }
