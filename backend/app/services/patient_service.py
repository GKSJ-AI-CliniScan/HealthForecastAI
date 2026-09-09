"""Patient service - business logic layer for patient records and scoping."""

from sqlalchemy.orm import Session
from app.models import Patient, User
from app.core.rbac import Role
from app.api.deps import CurrentUser


def get_patients_for_user(db: Session, current_user: CurrentUser) -> list[Patient]:
    """Return patients filtered according to caller's role privileges."""
    if current_user.role == Role.DOCTOR:
        if current_user.subject.isdigit():
            user_id = int(current_user.subject)
        else:
            user = db.query(User).filter(User.email == current_user.subject).first()
            user_id = user.id if user else None

        # Doctors see only assigned patients
        return db.query(Patient).filter(Patient.assigned_doctor_id == user_id).all()

    # Hospital Admin and System Admin see all patient records
    return db.query(Patient).all()
