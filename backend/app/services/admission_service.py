"""admission service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

An admission is only as visible as the patient it belongs to, so every method here
resolves the patient through PatientService first. Reusing that check rather than
re-deriving one is what stops admission scope from drifting away from patient
scope as either changes.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.models.admission import Admission
from app.repositories.admission_repository import AdmissionRepository
from app.repositories.audit_repository import AuditRepository
from app.services.patient_service import PatientNotFoundError, PatientService

UPDATABLE_FIELDS = frozenset(
    {
        "admission_date",
        "discharge_date",
        "time_in_hospital",
        "admission_type",
        "discharge_disposition",
        "num_medications",
        "num_lab_procedures",
        "number_diagnoses",
        "readmitted",
    }
)


class AdmissionNotFoundError(Exception):
    """Raised when an admission does not exist or belongs to another patient."""


class UnknownFieldError(Exception):
    """Raised when an update names a field that is not updatable."""


class AdmissionService:
    """Admission history and readmission tracking for a patient."""

    def __init__(self, db: Session) -> None:
        self.admissions = AdmissionRepository(db)
        self.patients = PatientService(db)
        self.audit = AuditRepository(db)

    def _require_patient(self, user: CurrentUser, patient_id: int) -> None:
        """Raise PatientNotFoundError unless the caller may see this patient."""
        self.patients.get_patient(user, patient_id)

    def list_for_patient(
        self, user: CurrentUser, patient_id: int, limit: int = 50, offset: int = 0
    ) -> tuple[list[Admission], int]:
        """Return one patient's admission timeline, most recent first."""
        self._require_patient(user, patient_id)
        rows = self.admissions.list_for_patient(patient_id, limit=limit, offset=offset)
        return rows, self.admissions.count_for_patient(patient_id)

    def get_admission(self, user: CurrentUser, patient_id: int, admission_id: int) -> Admission:
        """Return one admission belonging to a patient the caller may see."""
        self._require_patient(user, patient_id)
        admission = self.admissions.get(admission_id)
        if admission is None or admission.patient_id != patient_id:
            raise AdmissionNotFoundError(str(admission_id))
        return admission

    def create_admission(
        self, user: CurrentUser, patient_id: int, values: dict[str, Any]
    ) -> Admission:
        """Record a new admission against a patient."""
        self._require_patient(user, patient_id)
        admission = self.admissions.create(patient_id=patient_id, **values)
        self.audit.record(
            action="admission.create",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"admission:{admission.id}",
        )
        return admission

    def update_admission(
        self, user: CurrentUser, patient_id: int, admission_id: int, changes: dict[str, Any]
    ) -> Admission:
        """Apply a partial update to an admission."""
        unknown = set(changes) - UPDATABLE_FIELDS
        if unknown:
            raise UnknownFieldError(", ".join(sorted(unknown)))

        admission = self.get_admission(user, patient_id, admission_id)

        # The stored row and the incoming change together must still satisfy the
        # admissions_date_order_check constraint, which a partial update could
        # otherwise break by moving only one of the two dates.
        merged_admission = changes.get("admission_date", admission.admission_date)
        merged_discharge = changes.get("discharge_date", admission.discharge_date)
        if (
            merged_admission is not None
            and merged_discharge is not None
            and merged_discharge < merged_admission
        ):
            raise ValueError("discharge_date cannot be before admission_date")

        updated = self.admissions.update(admission, **changes)
        self.audit.record(
            action="admission.update",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"admission:{updated.id}",
        )
        return updated

    def readmission_summary(self, user: CurrentUser, patient_id: int) -> dict[str, Any]:
        """Return readmission tracking for a patient the caller may see."""
        self._require_patient(user, patient_id)
        summary = self.admissions.readmission_summary(patient_id)
        readmitted_total = summary.pop("readmitted_total", 0)
        return {
            "patient_id": patient_id,
            "total_admissions": self.admissions.count_for_patient(patient_id),
            "readmitted_total": readmitted_total,
            "by_label": summary,
        }


__all__ = [
    "AdmissionNotFoundError",
    "AdmissionService",
    "PatientNotFoundError",
    "UnknownFieldError",
]
