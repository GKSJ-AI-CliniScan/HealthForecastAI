"""patient service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.
"""

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.models.patient import Patient


def get_visible_patients(db: Session, user: CurrentUser) -> list[Patient]:
    """Return the patients the caller is allowed to see, per the access matrix.

    - doctor          -> only patients assigned to them
    - hospital_admin   -> hospital wide, read only
    - system_admin     -> everything
    - researcher        -> handled separately via /patients/anonymised
    """
    query = db.query(Patient)

    if user.role is Role.DOCTOR:
        # A doctor's subject is their user id (set at login time).
        query = query.filter(Patient.assigned_doctor_id == int(user.subject))
    elif user.role in (Role.HOSPITAL_ADMIN, Role.SYSTEM_ADMIN):
        pass  # no filter - hospital wide / full access
    else:
        # Any other role has no direct patient-list access.
        return []

    return query.order_by(Patient.id).all()


def get_anonymised_cohort(db: Session) -> list[dict]:
    """Return a de-identified patient cohort for researchers.

    Strips every direct identifier (real id, MRN, assigned doctor) and
    replaces the id with a pseudonymous label, joined with each patient's
    latest risk category where available.
    """
    from sqlalchemy import func

    from app.models.prediction import RiskPrediction

    latest_ids = (
        db.query(
            RiskPrediction.patient_id,
            func.max(RiskPrediction.created_at).label("latest"),
        )
        .group_by(RiskPrediction.patient_id)
        .subquery()
    )

    latest_risk = (
        db.query(RiskPrediction.patient_id, RiskPrediction.risk_category)
        .join(
            latest_ids,
            (RiskPrediction.patient_id == latest_ids.c.patient_id)
            & (RiskPrediction.created_at == latest_ids.c.latest),
        )
        .all()
    )
    risk_by_patient = dict(latest_risk)

    patients = db.query(Patient).order_by(Patient.id).all()

    cohort = []
    for index, p in enumerate(patients, start=1):
        cohort.append(
            {
                "pseudo_id": f"RSCH-{index:04d}",  # sequential, not the real db id
                "age_group": p.age_group,
                "gender": p.gender,
                "primary_diagnosis": p.primary_diagnosis,
                "risk_category": risk_by_patient.get(p.id, "not_scored"),
            }
        )
    return cohort
