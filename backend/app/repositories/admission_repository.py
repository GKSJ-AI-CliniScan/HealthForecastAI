"""Data access for hospital admissions."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.repositories.base import BaseRepository

# Values the source datasets use to mean "this encounter was not followed by a
# readmission". Anything else records one, with the window in the value itself.
NOT_READMITTED = frozenset({"NO", "No", "no", "0", ""})


class AdmissionRepository(BaseRepository[Admission]):
    """Queries the admission management endpoints depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(Admission, db)

    def list_for_patient(
        self, patient_id: int, limit: int = 100, offset: int = 0
    ) -> list[Admission]:
        """Return one patient's admissions, most recent first."""
        stmt = (
            select(Admission)
            .where(Admission.patient_id == patient_id)
            .order_by(Admission.admission_date.desc().nullslast(), Admission.id.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def count_for_patient(self, patient_id: int) -> int:
        """Return how many admissions a patient has."""
        stmt = select(func.count()).select_from(Admission).where(Admission.patient_id == patient_id)
        return self.db.execute(stmt).scalar_one()

    def readmission_summary(self, patient_id: int) -> dict[str, int]:
        """Break a patient's admissions down by readmission outcome.

        Returns the raw dataset labels as keys (for example ``NO``, ``<30``,
        ``>30``) so the caller keeps the readmission window, plus a
        ``readmitted_total`` covering every label that is not a "no readmission"
        marker. Rows with no recorded outcome are reported under ``unknown``.
        """
        stmt = (
            select(Admission.readmitted, func.count())
            .where(Admission.patient_id == patient_id)
            .group_by(Admission.readmitted)
        )
        summary: dict[str, int] = {}
        readmitted_total = 0
        for label, quantity in self.db.execute(stmt).all():
            key = "unknown" if label is None else str(label)
            summary[key] = summary.get(key, 0) + quantity
            if label is not None and str(label) not in NOT_READMITTED:
                readmitted_total += quantity
        summary["readmitted_total"] = readmitted_total
        return summary
