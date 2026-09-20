"""Admission business logic."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.schemas.admission import AdmissionCreate


def create_admission(
    db: Session,
    payload: AdmissionCreate,
) -> Admission:
    """Create an admission for an existing patient."""

    patient = db.get(
        Patient,
        payload.patient_id,
    )

    if patient is None:
        raise ValueError(f"Patient {payload.patient_id} not found")

    if payload.discharge_date is not None and payload.discharge_date < payload.admission_date:
        raise ValueError("discharge_date cannot be before admission_date")

    admission = Admission(
        patient_id=payload.patient_id,
        admission_date=payload.admission_date,
        discharge_date=payload.discharge_date,
        time_in_hospital=payload.time_in_hospital,
        admission_type=payload.admission_type,
        discharge_disposition=payload.discharge_disposition,
        num_medications=payload.num_medications,
        num_lab_procedures=payload.num_lab_procedures,
        number_diagnoses=payload.number_diagnoses,
        readmitted=payload.readmitted,
    )

    db.add(admission)
    db.commit()
    db.refresh(admission)

    return admission
