"""Data access for patient records, including doctor scope enforcement."""

from sqlalchemy import ColumnElement, Select, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models.doctor_patient_map import DoctorPatientMap
from app.models.patient import Patient
from app.repositories.base import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    """Queries the patient management endpoints depend on.

    Every read that a doctor performs is narrowed by :meth:`scope_clause`, which is
    the single place the "assigned patients only" rule is expressed.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(Patient, db)

    @staticmethod
    def scope_clause(doctor_id: int) -> ColumnElement[bool]:
        """Return the predicate matching the patients one doctor may see.

        A patient is in scope when they are the doctor's primary assignment
        (patients.assigned_doctor_id) or when a doctor_patient_map row grants
        access - the union the project brief requires for co-managed cases.

        EXISTS is used rather than a JOIN so that a patient who is both primary
        and mapped is still returned exactly once.
        """
        mapped = exists().where(
            DoctorPatientMap.patient_id == Patient.id,
            DoctorPatientMap.doctor_id == doctor_id,
        )
        return or_(Patient.assigned_doctor_id == doctor_id, mapped)

    def _scoped(self, doctor_id: int | None) -> Select[tuple[Patient]]:
        stmt = select(Patient)
        if doctor_id is not None:
            stmt = stmt.where(self.scope_clause(doctor_id))
        return stmt

    def get_by_mrn(self, medical_record_number: str) -> Patient | None:
        """Return the patient with this medical record number, if one exists."""
        stmt = select(Patient).where(Patient.medical_record_number == medical_record_number.strip())
        return self.db.execute(stmt).scalars().first()

    def mrn_exists(self, medical_record_number: str) -> bool:
        """Return True when the medical record number is already taken."""
        return self.get_by_mrn(medical_record_number) is not None

    def is_visible_to_doctor(self, patient_id: int, doctor_id: int) -> bool:
        """Return True when the doctor is allowed to read this patient."""
        stmt = select(Patient.id).where(Patient.id == patient_id, self.scope_clause(doctor_id))
        return self.db.execute(stmt).scalars().first() is not None

    def list_patients(
        self, limit: int = 100, offset: int = 0, doctor_id: int | None = None
    ) -> list[Patient]:
        """Return a page of patients.

        Passing ``doctor_id`` narrows the page to that doctor's scope; passing
        ``None`` returns the hospital wide list and is only ever called for roles
        the access matrix grants full visibility.
        """
        stmt = self._scoped(doctor_id).order_by(Patient.id).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars().all())

    def count_patients(self, doctor_id: int | None = None) -> int:
        """Return how many patients are visible under the same scope rules."""
        inner = self._scoped(doctor_id).subquery()
        stmt = select(func.count()).select_from(inner)
        return self.db.execute(stmt).scalar_one()

    def search(
        self,
        term: str,
        limit: int = 100,
        offset: int = 0,
        doctor_id: int | None = None,
    ) -> list[Patient]:
        """Search by medical record number or primary diagnosis.

        The search runs inside the caller's scope, so narrowing by a term can never
        widen what a doctor is able to see.
        """
        needle = f"%{term.strip().lower()}%"
        stmt = (
            self._scoped(doctor_id)
            .where(
                or_(
                    func.lower(Patient.medical_record_number).like(needle),
                    func.lower(Patient.primary_diagnosis).like(needle),
                )
            )
            .order_by(Patient.id)
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())
