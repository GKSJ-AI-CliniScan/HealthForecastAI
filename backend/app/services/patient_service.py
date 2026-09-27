"""patient service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

Every read here passes through patient_scope_for, so a doctor only ever sees the
patients assigned to them. That narrowing is applied in this one place rather than
in each handler, because a handler that forgets it leaks patient records.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.core.config import settings
from app.models.patient import Patient
from app.repositories.audit_repository import AuditRepository
from app.repositories.patient_repository import PatientRepository
from app.schemas.analytics import ResearchCohortFilter
from app.utils.anonymisation import generalise_age

# Fields an authorised caller may change. medical_record_number is absent because
# it identifies the record; re-pointing it would silently rewrite history.
UPDATABLE_FIELDS = frozenset(
    {"age_group", "gender", "race", "primary_diagnosis", "assigned_doctor_id"}
)


class PatientNotFoundError(Exception):
    """Raised when a patient does not exist, or is outside the caller's scope.

    The two cases share an exception on purpose. Distinguishing them would tell a
    doctor that a patient they cannot read nonetheless exists, which is itself a
    disclosure about another clinician's caseload.
    """


class DuplicateMedicalRecordNumberError(Exception):
    """Raised when a medical record number is already in use."""


class UnknownFieldError(Exception):
    """Raised when an update names a field that is not updatable."""


class CohortTooSmallError(Exception):
    """Raised when a research export would be small enough to risk re-identification."""

    def __init__(self, size: int, minimum: int) -> None:
        self.size = size
        self.minimum = minimum
        super().__init__(f"Cohort of {size} is below the minimum of {minimum}")


class PatientService:
    """Patient record reads and writes, always inside the caller's scope."""

    def __init__(self, db: Session) -> None:
        self.patients = PatientRepository(db)
        self.audit = AuditRepository(db)

    def list_patients(
        self,
        user: CurrentUser,
        limit: int = 50,
        offset: int = 0,
        query: str | None = None,
    ) -> tuple[list[Patient], int]:
        """Return a page of patients the caller may see, and the matching total.

        A search term narrows within the caller's scope, so searching can never
        surface a patient the caller could not already list.
        """
        doctor_id = patient_scope_for(user)
        if query:
            rows = self.patients.search(query, limit=limit, offset=offset, doctor_id=doctor_id)
            total = len(rows)
        else:
            rows = self.patients.list_patients(limit=limit, offset=offset, doctor_id=doctor_id)
            total = self.patients.count_patients(doctor_id=doctor_id)

        self.audit.record(
            action="patient.list",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"query:{query}" if query else "all",
        )
        return rows, total

    def get_patient(self, user: CurrentUser, patient_id: int) -> Patient:
        """Return one patient, or raise if it is missing or out of scope."""
        doctor_id = patient_scope_for(user)
        patient = self.patients.get(patient_id)

        visible = patient is not None and (
            doctor_id is None or self.patients.is_visible_to_doctor(patient_id, doctor_id)
        )
        if not visible:
            self.audit.record(
                action="patient.read",
                actor_id=user.user_id,
                actor_role=str(user.role),
                resource=f"patient:{patient_id}",
                outcome="failure",
            )
            raise PatientNotFoundError(str(patient_id))

        # FR-AUD-02: every access to a patient record is recorded.
        self.audit.record(
            action="patient.read",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"patient:{patient_id}",
        )
        assert patient is not None  # narrowed by `visible` above
        return patient

    def create_patient(
        self,
        user: CurrentUser,
        medical_record_number: str,
        age_group: str | None = None,
        gender: str | None = None,
        race: str | None = None,
        primary_diagnosis: str | None = None,
        assigned_doctor_id: int | None = None,
    ) -> Patient:
        """Create a patient record."""
        mrn = medical_record_number.strip()
        if self.patients.mrn_exists(mrn):
            self.audit.record(
                action="patient.create",
                actor_id=user.user_id,
                actor_role=str(user.role),
                resource=f"mrn:{mrn}",
                outcome="failure",
            )
            raise DuplicateMedicalRecordNumberError(mrn)

        patient = self.patients.create(
            medical_record_number=mrn,
            age_group=age_group,
            gender=gender,
            race=race,
            primary_diagnosis=primary_diagnosis,
            assigned_doctor_id=assigned_doctor_id,
        )
        self.audit.record(
            action="patient.create",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"patient:{patient.id}",
        )
        return patient

    def update_patient(
        self, user: CurrentUser, patient_id: int, changes: dict[str, Any]
    ) -> Patient:
        """Apply a partial update to a patient the caller may see."""
        unknown = set(changes) - UPDATABLE_FIELDS
        if unknown:
            raise UnknownFieldError(", ".join(sorted(unknown)))

        patient = self.get_patient(user, patient_id)
        updated = self.patients.update(patient, **changes)
        self.audit.record(
            action="patient.update",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"patient:{updated.id}",
        )
        return updated

    def research_cohort(
        self,
        filters: ResearchCohortFilter | None = None,
        min_cohort_size: int | None = None,
    ) -> list[Patient]:
        """Return the full filtered research cohort, or raise CohortTooSmallError.

        The guard is applied to the cohort *after* every filter, so narrowing
        filters can never be used to pull out a group smaller than the
        minimum. Never doctor-scoped: Researcher access is
        hospital-wide-but-anonymised per the access matrix.
        """
        filters = filters or ResearchCohortFilter()
        minimum = (
            min_cohort_size if min_cohort_size is not None else settings.RESEARCH_MIN_COHORT_SIZE
        )
        rows = self.patients.research_cohort(
            diagnosis=filters.diagnosis,
            gender=filters.gender,
            admitted_from=filters.date_from,
            admitted_to=filters.date_to,
        )
        if filters.age_band is not None:
            # Matched on the generalised band - the only age value a researcher
            # ever sees - so the filter cannot address a single raw age.
            wanted = filters.age_band.strip()
            rows = [row for row in rows if generalise_age(row.age_group) == wanted]
        if len(rows) < minimum:
            raise CohortTooSmallError(size=len(rows), minimum=minimum)
        return rows

    def list_for_research(
        self,
        user: CurrentUser,
        min_cohort_size: int | None = None,
        filters: ResearchCohortFilter | None = None,
    ) -> list[Patient]:
        """research_cohort, audited as a research export (FR-AUD / SRS "export logged")."""
        try:
            rows = self.research_cohort(filters, min_cohort_size)
        except CohortTooSmallError as exc:
            self.audit.record(
                action="patient.research_export",
                actor_id=user.user_id,
                actor_role=str(user.role),
                resource=research_audit_resource(exc.size, filters),
                outcome="failure",
            )
            raise

        self.audit.record(
            action="patient.research_export",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=research_audit_resource(len(rows), filters),
        )
        return rows


# audit_logs.resource is VARCHAR(128); PostgreSQL rejects a longer value.
_AUDIT_RESOURCE_MAX = 128


def research_audit_resource(size: int, filters: ResearchCohortFilter | None) -> str:
    """Cohort size plus the filters applied, truncated to fit audit_logs.resource."""
    applied = filters.model_dump(exclude_none=True, mode="json") if filters else {}
    rendered = ",".join(f"{key}={value}" for key, value in sorted(applied.items())) or "none"
    return f"cohort_size:{size};filters:{rendered}"[:_AUDIT_RESOURCE_MAX]
