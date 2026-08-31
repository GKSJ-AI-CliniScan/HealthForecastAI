"""User ORM model.

The role is stored as a plain string validated against ``app.core.rbac.Role``
rather than a native database enum. Adding a role to a PostgreSQL enum requires
a migration and locks the type; the access matrix is expected to grow across
milestones, so the constraint is kept in the application layer where it can be
tested.
"""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.rbac import Role
from app.db.base import Base


class User(Base):
    """A platform user: doctor, hospital admin, researcher or system admin."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Only the bcrypt hash is stored; plaintext never reaches the database.
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default=str(Role.DOCTOR), nullable=False)
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Accounts are disabled rather than deleted so audit history stays intact.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    assigned_patients: Mapped[list["Patient"]] = relationship(  # noqa: F821
        back_populates="assigned_doctor"
    )

    def __repr__(self) -> str:
        """Return a short debugging representation without the password hash."""
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"
