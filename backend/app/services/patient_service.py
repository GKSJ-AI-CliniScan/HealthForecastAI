"""Patient service - business logic layer.

Handles patient record operations with role-based data scoping.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.patient import Patient

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.models.patient import Patient
from app.schemas.patient import PatientCreate


def get_scoped_patients(db: Session, user: CurrentUser) -> list[Patient]:
    """Return patient records filtered by the caller's role permissions."""

    if user.role == Role.RESEARCHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Researchers must use /patients/anonymised",
        )

    query = db.query(Patient)

    if user.role == Role.DOCTOR:
        try:
            doctor_id = int(user.subject)
        except (ValueError, TypeError):
            return []

        query = query.filter(Patient.assigned_doctor_id == doctor_id)

    return query.limit(50).all()

def create_patient_record(db: Session, payload: PatientCreate) -> Patient:
    """Create a new patient record in PostgreSQL."""
    existing = (
        db.query(Patient)
        .filter(Patient.medical_record_number == payload.medical_record_number)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A patient with this medical record number already exists.",
        )

    patient = Patient(
        medical_record_number=payload.medical_record_number,
        age_group=payload.age_group,
        gender=payload.gender,
        race=payload.race,
        primary_diagnosis=payload.primary_diagnosis,
        assigned_doctor_id=payload.assigned_doctor_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient
from app.models.admission import Admission
from app.services.risk_service import evaluate_patient_risk


def get_dashboard_patients(db: Session, user: CurrentUser) -> list[dict]:
    patients = get_scoped_patients(db=db, user=user)

    results = []

    for patient in patients:
        admission = (
            db.query(Admission)
            .filter(Admission.patient_id == patient.id)
            .order_by(Admission.id.desc())
            .first()
        )

        if admission is None:
            results.append({
                "patient_id": patient.id,
                "medical_record_number": patient.medical_record_number,
                "age_group": patient.age_group,
                "gender": patient.gender,
                "race": patient.race,

                "admission_id": None,
                "time_in_hospital": None,
                "num_medications": None,
                "num_lab_procedures": None,
                "number_diagnoses": None,
                "number_inpatient": None,
                "number_emergency": None,
                "A1Cresult": None,
                "readmitted": None,

                "readmission_probability": 0,
                "risk_category": "LOW",
                "contributing_factors": [],
                "recommended_actions": [],
            })
            continue

        risk_data = {
            "number_inpatient": admission.number_inpatient or 0,
            "number_emergency": admission.number_emergency or 0,
            "time_in_hospital": admission.time_in_hospital or 1,
            "num_medications": admission.num_medications or 1,
            "number_diagnoses": admission.number_diagnoses or 1,
            "num_lab_procedures": admission.num_lab_procedures or 0,
            "A1Cresult": admission.A1Cresult or "None",
        }

        risk = evaluate_patient_risk(risk_data)

        results.append({
            "patient_id": patient.id,
            "medical_record_number": patient.medical_record_number,
            "age_group": patient.age_group,
            "gender": patient.gender,
            "race": patient.race,

            "admission_id": admission.id,
            "time_in_hospital": admission.time_in_hospital,
            "num_medications": admission.num_medications,
            "num_lab_procedures": admission.num_lab_procedures,
            "number_diagnoses": admission.number_diagnoses,
            "number_inpatient": admission.number_inpatient,
            "number_emergency": admission.number_emergency,
            "A1Cresult": admission.A1Cresult,
            "readmitted": admission.readmitted,

            "readmission_probability": risk["readmission_probability"],
            "risk_category": risk["risk_category"],
            "contributing_factors": risk["contributing_factors"],
            "recommended_actions": risk["recommended_actions"],
        })

    return results
def assign_patient_to_doctor(
    db: Session,
    patient_id: int,
    doctor_id: int,
) -> Patient:
    """Assign an existing patient to a doctor."""

    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id)
        .first()
    )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    patient.assigned_doctor_id = doctor_id

    db.commit()
    db.refresh(patient)

    return patient
