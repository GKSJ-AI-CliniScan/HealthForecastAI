"""Researcher data anonymization utility."""

import hashlib
import uuid
from datetime import date
from typing import Any
from app.models.patient import Patient
from app.schemas.patient import AnonymizedPatientResponse


def calculate_age_group(dob: date | None) -> str | None:
    """Calculate age bracket (e.g., [50-60)) from date of birth."""
    if not dob:
        return "[Unknown]"
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 10:
        return "[0-10)"
    if age < 20:
        return "[10-20)"
    if age < 30:
        return "[20-30)"
    if age < 40:
        return "[30-40)"
    if age < 50:
        return "[40-50)"
    if age < 60:
        return "[50-60)"
    if age < 70:
        return "[60-70)"
    if age < 80:
        return "[70-80)"
    if age < 90:
        return "[80-90)"
    return "[90-100+)"


def generate_anonymized_id(patient_id: uuid.UUID | str) -> str:
    """Generate a consistent anonymized identifier using a SHA-256 digest."""
    salt = "HealthForecastAI_Researcher_Salt_2026"
    raw_str = f"{salt}:{str(patient_id)}"
    digest = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()[:6].upper()
    return f"ANON-PAT-{digest}"


def anonymize_patient(patient: Patient) -> AnonymizedPatientResponse:
    """Convert a Patient ORM entity into a strictly sanitized AnonymizedPatientResponse."""
    return AnonymizedPatientResponse(
        id=patient.id,
        anonymized_patient_id=generate_anonymized_id(patient.id),
        age_group=calculate_age_group(patient.date_of_birth),
        gender=patient.gender,
        created_at=patient.created_at,
        is_anonymized=True,
    )
