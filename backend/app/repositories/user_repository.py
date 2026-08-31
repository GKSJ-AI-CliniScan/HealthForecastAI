"""User Repository."""

import uuid
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.models.role import Role
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Data access methods for Users."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> User | None:
        """Find user by email."""
        return (
            self.db.query(User)
            .options(joinedload(User.role_rel))
            .filter(func.lower(User.email) == email.lower().strip())
            .first()
        )

    def get_by_username(self, username: str) -> User | None:
        """Find user by username."""
        return (
            self.db.query(User)
            .options(joinedload(User.role_rel))
            .filter(func.lower(User.username) == username.lower().strip())
            .first()
        )

    def get_by_username_or_email(self, identifier: str) -> User | None:
        """Find user by username or email."""
        clean_id = identifier.lower().strip()
        return (
            self.db.query(User)
            .options(joinedload(User.role_rel))
            .filter(
                or_(
                    func.lower(User.username) == clean_id,
                    func.lower(User.email) == clean_id,
                )
            )
            .first()
        )

    def get_by_id_with_role(self, id_: uuid.UUID) -> User | None:
        """Find user with role preloaded."""
        return self.db.query(User).options(joinedload(User.role_rel)).filter(User.id == id_).first()

    def list_users(
        self,
        skip: int = 0,
        limit: int = 10,
        search: str | None = None,
        role_name: str | None = None,
    ) -> tuple[list[User], int]:
        """List users with search, role filtering and pagination."""
        query = self.db.query(User).options(joinedload(User.role_rel))

        if role_name:
            query = query.join(User.role_rel).filter(Role.name == role_name.upper())

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.username.ilike(search_pattern),
                )
            )

        total = query.count()
        items = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_doctors(self) -> list[User]:
        """Get all active doctors."""
        return (
            self.db.query(User)
            .join(User.role_rel)
            .filter(Role.name == "DOCTOR", User.is_active == True)
            .order_by(User.first_name)
            .all()
        )
