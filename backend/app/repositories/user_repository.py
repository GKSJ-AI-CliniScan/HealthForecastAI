"""Data access for platform users."""

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Queries the authentication and user management endpoints depend on."""

    def __init__(self, db: Session) -> None:
        super().__init__(User, db)

    def _filtered(self, role: Role | None, is_active: bool | None) -> Select[tuple[User]]:
        stmt = select(User)
        if role is not None:
            stmt = stmt.where(User.role == str(role))
        if is_active is not None:
            stmt = stmt.where(User.is_active.is_(is_active))
        return stmt

    def get_by_email(self, email: str) -> User | None:
        """Return the user with this email address, if one exists.

        Email is matched case insensitively because an address that differs only
        in case is the same account, and letting both exist would split a login.
        """
        stmt = select(User).where(func.lower(User.email) == email.strip().lower())
        return self.db.execute(stmt).scalars().first()

    def email_exists(self, email: str) -> bool:
        """Return True when the email address is already registered."""
        return self.get_by_email(email) is not None

    def list_users(
        self,
        limit: int = 100,
        offset: int = 0,
        role: Role | None = None,
        is_active: bool | None = None,
    ) -> list[User]:
        """Return a page of users, newest first, optionally filtered."""
        stmt = self._filtered(role, is_active).order_by(User.id.desc()).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars().all())

    def count_users(self, role: Role | None = None, is_active: bool | None = None) -> int:
        """Return how many users match the given filters."""
        inner = self._filtered(role, is_active).subquery()
        stmt = select(func.count()).select_from(inner)
        return self.db.execute(stmt).scalar_one()
