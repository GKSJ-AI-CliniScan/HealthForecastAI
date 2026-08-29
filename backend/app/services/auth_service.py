"""Authentication business logic, kept out of the endpoint layer.

Endpoints stay thin so the rules here can be unit tested without spinning up an
HTTP client.
"""

from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


class AuthError(Exception):
    """Raised when credentials are rejected or an account cannot be used."""


class DuplicateUserError(Exception):
    """Raised when an email address is already registered."""


def get_user_by_email(db: Session, email: str) -> User | None:
    """Look up a user by their normalised email address."""
    return db.query(User).filter(User.email == email.lower().strip()).one_or_none()


def authenticate(db: Session, email: str, password: str) -> User:
    """Verify credentials and return the user.

    The same message is returned whether the address is unknown or the password
    is wrong. Distinguishing them would let an attacker enumerate valid accounts.
    """
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise AuthError("Incorrect email or password")
    if not user.is_active:
        raise AuthError("Account is disabled")
    return user


def create_user(db: Session, payload: UserCreate) -> User:
    """Create a platform account with a hashed password."""
    if get_user_by_email(db, payload.email) is not None:
        raise DuplicateUserError(f"An account already exists for {payload.email}")

    user = User(
        email=payload.email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_active(db: Session, user_id: int, is_active: bool) -> User:
    """Enable or disable an account without deleting its history.

    Clinical audit trails need the user row to survive, so accounts are disabled
    rather than removed.
    """
    user = db.get(User, user_id)
    if user is None:
        raise AuthError(f"No user with id {user_id}")
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def role_of(user: User) -> Role:
    """Return the user's role as an enum, raising when the stored value is invalid."""
    return Role(user.role)
