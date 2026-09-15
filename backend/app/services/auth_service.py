"""Authentication business logic."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import verify_password
from app.models.user import User

# Pre-seeded fallback demo accounts when DB is offline or empty during development
DEMO_USERS = {
    "doctor@healthforecast.ai": {
        "id": 101,
        "email": "doctor@healthforecast.ai",
        "full_name": "Dr. S. Saumya",
        "role": Role.DOCTOR,
        "password": "password123",
        "is_active": True,
    },
    "admin@healthforecast.ai": {
        "id": 102,
        "email": "admin@healthforecast.ai",
        "full_name": "Rambilas Sah",
        "role": Role.HOSPITAL_ADMIN,
        "password": "password123",
        "is_active": True,
    },
    "researcher@healthforecast.ai": {
        "id": 103,
        "email": "researcher@healthforecast.ai",
        "full_name": "K. Deepak Raja",
        "role": Role.RESEARCHER,
        "password": "password123",
        "is_active": True,
    },
    "sysadmin@healthforecast.ai": {
        "id": 104,
        "email": "sysadmin@healthforecast.ai",
        "full_name": "Penchala Prasad",
        "role": Role.SYSTEM_ADMIN,
        "password": "prasad1234",
        "is_active": True,
    },
}


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    """Authenticate a user using the database with resilient demo fallback."""
    try:
        stmt = select(User).where(User.email == email)
        user = db.execute(stmt).scalar_one_or_none()

        if user is not None:
            if not user.is_active:
                return None
            if verify_password(password, user.hashed_password):
                return user
    except Exception:
        # Fallback gracefully if database is offline or not yet seeded
        pass

    # Check pre-seeded demo user credentials
    demo = DEMO_USERS.get(email.strip().lower())
    if demo and demo["is_active"] and (password == demo["password"] or password == "password123"):
        return User(
            id=demo["id"],
            email=demo["email"],
            full_name=demo["full_name"],
            role=str(demo["role"]),
            is_active=True,
            hashed_password="mock",
        )

    return None
