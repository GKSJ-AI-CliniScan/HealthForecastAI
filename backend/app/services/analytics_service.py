"""Healthcare analytics - the aggregate queries behind the dashboards.

Milestone 1 delivers the descriptive layer: cohort size, readmission rate,
length of stay, and the breakdowns each role is allowed to see. Milestone 3
extends this with treatment effectiveness and trend monitoring.
"""

from __future__ import annotations

from sqlalchemy import Float, case, cast, func, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.user import User

# The dataset encodes the target as "<30", ">30" or "NO". The brief targets
# readmission within 30 days, so only "<30" counts as a positive outcome.
READMITTED_WITHIN_30 = "<30"


def _readmission_case() -> case:
    """SQL expression that is 1 for a 30-day readmission and 0 otherwise."""
    return case((Admission.readmitted == READMITTED_WITHIN_30, 1), else_=0)


def dashboard_summary(db: Session, actor: User) -> dict[str, object]:
    """Return the headline KPIs for the caller's dashboard.

    A doctor sees their own caseload; everyone else sees the hospital.
    """
    patient_filter = []
    if actor.role == Role.DOCTOR:
        patient_filter.append(Patient.assigned_doctor_id == actor.id)

    total_patients = db.execute(
        select(func.count()).select_from(Patient).where(*patient_filter)
    ).scalar_one()

    admission_query = select(
        func.count(Admission.id),
        func.avg(cast(Admission.time_in_hospital, Float)),
        func.sum(_readmission_case()),
    ).select_from(Admission)

    if patient_filter:
        admission_query = admission_query.join(Patient, Patient.id == Admission.patient_id).where(
            *patient_filter
        )

    total_admissions, avg_stay, readmitted = db.execute(admission_query).one()

    total_admissions = total_admissions or 0
    readmitted = readmitted or 0
    readmission_rate = (readmitted / total_admissions) if total_admissions else 0.0

    # Risk banding arrived in Milestone 2. Import here rather than at module
    # scope: risk_service imports the analytics models, and a top-level import
    # in both directions would be circular.
    from app.services import risk_service

    return {
        "scope": "caseload" if actor.role == Role.DOCTOR else "hospital",
        "total_patients": total_patients,
        "total_admissions": total_admissions,
        "readmissions_within_30_days": int(readmitted),
        "readmission_rate": round(readmission_rate, 4),
        "average_length_of_stay": round(float(avg_stay or 0.0), 2),
        "risk_distribution": risk_service.risk_distribution(db, actor),
    }


def readmission_by_age_group(db: Session, limit: int = 20) -> list[dict[str, object]]:
    """Return the 30-day readmission rate per age band."""
    stmt = (
        select(
            Patient.age_group,
            func.count(Admission.id).label("admissions"),
            func.sum(_readmission_case()).label("readmitted"),
        )
        .join(Patient, Patient.id == Admission.patient_id)
        .where(Patient.age_group.is_not(None))
        .group_by(Patient.age_group)
        .order_by(Patient.age_group)
        .limit(limit)
    )

    results = []
    for age_group, admissions, readmitted in db.execute(stmt):
        admissions = admissions or 0
        readmitted = readmitted or 0
        results.append(
            {
                "age_group": age_group,
                "admissions": admissions,
                "readmissions": int(readmitted),
                "readmission_rate": round(readmitted / admissions, 4) if admissions else 0.0,
            }
        )
    return results


def readmission_by_admission_type(db: Session, limit: int = 20) -> list[dict[str, object]]:
    """Return the 30-day readmission rate per admission type."""
    stmt = (
        select(
            Admission.admission_type,
            func.count(Admission.id),
            func.sum(_readmission_case()),
        )
        .where(Admission.admission_type.is_not(None))
        .group_by(Admission.admission_type)
        .order_by(func.count(Admission.id).desc())
        .limit(limit)
    )

    results = []
    for admission_type, admissions, readmitted in db.execute(stmt):
        admissions = admissions or 0
        readmitted = readmitted or 0
        results.append(
            {
                "admission_type": admission_type,
                "admissions": admissions,
                "readmissions": int(readmitted),
                "readmission_rate": round(readmitted / admissions, 4) if admissions else 0.0,
            }
        )
    return results


def length_of_stay_distribution(db: Session) -> list[dict[str, int]]:
    """Return how many admissions lasted each number of days."""
    stmt = (
        select(Admission.time_in_hospital, func.count(Admission.id))
        .where(Admission.time_in_hospital.is_not(None))
        .group_by(Admission.time_in_hospital)
        .order_by(Admission.time_in_hospital)
    )
    return [{"days": days, "admissions": count} for days, count in db.execute(stmt)]


def population_health_overview(db: Session) -> dict[str, object]:
    """Return aggregate-only statistics for the researcher role.

    Every value here is a count or a rate over a group. No row-level record and
    no identifier leaves this function.
    """
    gender_stmt = (
        select(Patient.gender, func.count(Patient.id))
        .where(Patient.gender.is_not(None))
        .group_by(Patient.gender)
    )
    race_stmt = (
        select(Patient.race, func.count(Patient.id))
        .where(Patient.race.is_not(None))
        .group_by(Patient.race)
        .order_by(func.count(Patient.id).desc())
        .limit(12)
    )

    return {
        "cohort_size": db.execute(select(func.count()).select_from(Patient)).scalar_one(),
        "by_gender": [{"gender": g, "patients": c} for g, c in db.execute(gender_stmt)],
        "by_race": [{"race": r, "patients": c} for r, c in db.execute(race_stmt)],
        "by_age_group": readmission_by_age_group(db),
    }
