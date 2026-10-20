"""Patient data management with role based scoping.

Patients are held in an in-memory store seeded with SYNTHETIC records (a fixed
random seed, so every run gives the same data). No real patient data is used.
Access rules follow the access matrix in app/core/rbac.py:

  doctor          -> only patients assigned to them
  hospital_admin  -> every patient, read only
  researcher      -> anonymised records only (see ``anonymised_cohort``)
  system_admin    -> everything
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from functools import lru_cache
from threading import Lock

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.services.model_service import baseline_probability

AGE_GROUPS = ["[30-40)", "[40-50)", "[50-60)", "[60-70)", "[70-80)", "[80-90)"]
DIAGNOSES = ["Diabetes", "Circulatory", "Respiratory", "Digestive", "Injury", "Other"]
DEPARTMENTS = ["Cardiology", "Endocrinology", "General Medicine", "Pulmonology"]
TREATMENTS = ["Insulin adjustment", "Metformin", "Dual therapy", "Lifestyle counselling"]
PSEUDONYM_SALT = "healthforecast-demo-salt"
SEED_PATIENT_COUNT = 120
DOCTOR_IDS = (1, 2)  # ids of the seeded demo doctors (see auth_service.DEMO_ACCOUNTS)

_lock = Lock()


@dataclass
class PatientRecord:
    """One patient with their latest admission."""

    id: int
    medical_record_number: str
    age_group: str
    gender: str
    race: str
    primary_diagnosis: str
    assigned_doctor_id: int | None
    department: str
    treatment: str
    admission_month: str  # YYYY-MM
    time_in_hospital: int
    num_medications: int
    num_lab_procedures: int
    number_diagnoses: int
    number_inpatient: int
    number_emergency: int
    recovery_score: float
    readmitted_30d: bool

    def features(self) -> dict[str, object]:
        """Return the model input for this patient's admission."""
        return {
            "time_in_hospital": self.time_in_hospital,
            "num_medications": self.num_medications,
            "num_lab_procedures": self.num_lab_procedures,
            "number_diagnoses": self.number_diagnoses,
            "number_inpatient": self.number_inpatient,
            "number_emergency": self.number_emergency,
            "age_group": self.age_group,
        }


def _generate(count: int) -> list[PatientRecord]:
    rng = random.Random(42)
    months = [f"2025-{m:02d}" for m in range(1, 13)]
    records: list[PatientRecord] = []
    for index in range(1, count + 1):
        record = PatientRecord(
            id=index,
            medical_record_number=f"MRN-{100000 + index}",
            age_group=rng.choices(AGE_GROUPS, weights=[4, 8, 16, 24, 28, 20])[0],
            gender=rng.choice(["Female", "Male"]),
            race=rng.choice(["Caucasian", "AfricanAmerican", "Asian", "Hispanic", "Other"]),
            primary_diagnosis=rng.choice(DIAGNOSES),
            assigned_doctor_id=DOCTOR_IDS[index % len(DOCTOR_IDS)],
            department=rng.choice(DEPARTMENTS),
            treatment=rng.choice(TREATMENTS),
            admission_month=rng.choice(months),
            time_in_hospital=rng.randint(1, 14),
            num_medications=rng.randint(4, 40),
            num_lab_procedures=rng.randint(10, 90),
            number_diagnoses=rng.randint(3, 9),
            number_inpatient=rng.choices([0, 1, 2, 3, 4], weights=[60, 20, 10, 6, 4])[0],
            number_emergency=rng.choices([0, 1, 2, 3], weights=[70, 18, 8, 4])[0],
            recovery_score=0.0,
            readmitted_30d=False,
        )
        probability = baseline_probability(record.features())
        record.readmitted_30d = rng.random() < probability
        record.recovery_score = round(
            max(5.0, min(100.0, 90 - 60 * probability + rng.uniform(-8, 8))), 1
        )
        records.append(record)
    return records


_patients: dict[int, PatientRecord] = {}


@lru_cache
def _ensure_seeded() -> bool:
    with _lock:
        if not _patients:
            for record in _generate(SEED_PATIENT_COUNT):
                _patients[record.id] = record
    return True


def all_patients() -> list[PatientRecord]:
    """Return every patient (callers must scope by role first)."""
    _ensure_seeded()
    return sorted(_patients.values(), key=lambda p: p.id)


def visible_patients(user: CurrentUser) -> list[PatientRecord]:
    """Return the patients the caller may see in identifiable form."""
    patients = all_patients()
    if user.role is Role.DOCTOR:
        return [p for p in patients if str(p.assigned_doctor_id) == user.subject]
    if user.role in (Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN):
        return patients
    return []


def get_visible_patient(user: CurrentUser, patient_id: int) -> PatientRecord | None:
    """Return one patient if the caller is allowed to see them."""
    return next((p for p in visible_patients(user) if p.id == patient_id), None)


def create_patient(
    *,
    medical_record_number: str,
    age_group: str | None,
    gender: str | None,
    race: str | None,
    primary_diagnosis: str | None,
    assigned_doctor_id: int | None,
) -> PatientRecord:
    """Add a patient. Raises ValueError when the MRN already exists."""
    _ensure_seeded()
    with _lock:
        if any(p.medical_record_number == medical_record_number for p in _patients.values()):
            raise ValueError("A patient with this medical record number already exists")
        patient_id = max(_patients, default=0) + 1
        record = PatientRecord(
            id=patient_id,
            medical_record_number=medical_record_number,
            age_group=age_group or "[60-70)",
            gender=gender or "Unknown",
            race=race or "Unknown",
            primary_diagnosis=primary_diagnosis or "Other",
            assigned_doctor_id=assigned_doctor_id,
            department="General Medicine",
            treatment="Metformin",
            admission_month="2025-12",
            time_in_hospital=3,
            num_medications=12,
            num_lab_procedures=40,
            number_diagnoses=5,
            number_inpatient=0,
            number_emergency=0,
            recovery_score=75.0,
            readmitted_30d=False,
        )
        _patients[patient_id] = record
    return record


def pseudonymise(medical_record_number: str) -> str:
    """Return a stable pseudonym that cannot be reversed to the MRN."""
    digest = hashlib.sha256(f"{PSEUDONYM_SALT}:{medical_record_number}".encode()).hexdigest()
    return f"P-{digest[:12]}"


def anonymised_cohort() -> list[dict[str, str]]:
    """Return de-identified records: no MRN, no doctor, no race, no exact values."""
    return [
        {
            "pseudo_id": pseudonymise(p.medical_record_number),
            "age_group": p.age_group,
            "gender": p.gender,
            "primary_diagnosis": p.primary_diagnosis,
        }
        for p in all_patients()
    ]
