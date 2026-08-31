"""Repository layer - the only place the application builds SQL."""

from app.repositories.admission_repository import AdmissionRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.base import BaseRepository
from app.repositories.doctor_patient_repository import DoctorPatientRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.user_repository import UserRepository

__all__ = [
    "AdmissionRepository",
    "AuditRepository",
    "BaseRepository",
    "DoctorPatientRepository",
    "PatientRepository",
    "UserRepository",
]
