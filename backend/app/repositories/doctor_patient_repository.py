"""Data access for doctor to patient scope assignments."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.doctor_patient_map import DoctorPatientMap
from app.repositories.base import BaseRepository


class DoctorPatientRepository(BaseRepository[DoctorPatientMap]):
    """Grants and revokes the scope that lets a doctor read a patient."""

    def __init__(self, db: Session) -> None:
        super().__init__(DoctorPatientMap, db)

    def get_assignment(self, doctor_id: int, patient_id: int) -> DoctorPatientMap | None:
        """Return the mapping row for this pair, if one exists."""
        stmt = select(DoctorPatientMap).where(
            DoctorPatientMap.doctor_id == doctor_id,
            DoctorPatientMap.patient_id == patient_id,
        )
        return self.db.execute(stmt).scalars().first()

    def is_assigned(self, doctor_id: int, patient_id: int) -> bool:
        """Return True when a mapping row grants this doctor access.

        This asks only about the mapping table. Full visibility also depends on
        patients.assigned_doctor_id, which PatientRepository.scope_clause unions in.
        """
        return self.get_assignment(doctor_id, patient_id) is not None

    def assign(
        self, doctor_id: int, patient_id: int, assigned_by: int | None = None
    ) -> DoctorPatientMap:
        """Grant a doctor access to a patient.

        Idempotent: re-assigning an existing pair returns the original row rather
        than raising on the uq_doctor_patient constraint, so a repeated request
        from the UI is harmless.
        """
        existing = self.get_assignment(doctor_id, patient_id)
        if existing is not None:
            return existing
        return self.create(doctor_id=doctor_id, patient_id=patient_id, assigned_by=assigned_by)

    def unassign(self, doctor_id: int, patient_id: int) -> bool:
        """Revoke access. Returns True when a mapping was actually removed."""
        existing = self.get_assignment(doctor_id, patient_id)
        if existing is None:
            return False
        self.delete(existing)
        return True

    def list_patient_ids_for_doctor(self, doctor_id: int) -> list[int]:
        """Return the patient ids explicitly mapped to this doctor."""
        stmt = select(DoctorPatientMap.patient_id).where(DoctorPatientMap.doctor_id == doctor_id)
        return list(self.db.execute(stmt).scalars().all())

    def list_doctor_ids_for_patient(self, patient_id: int) -> list[int]:
        """Return the doctor ids explicitly mapped to this patient."""
        stmt = select(DoctorPatientMap.doctor_id).where(DoctorPatientMap.patient_id == patient_id)
        return list(self.db.execute(stmt).scalars().all())
