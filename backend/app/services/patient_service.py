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
