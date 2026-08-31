"""User Management Service."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.audit_service import AuditService


class UserService:
    """Service managing system users and roles."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)
        self.audit_service = AuditService(db)

    def get_user_by_id(self, user_id: uuid.UUID) -> UserResponse:
        """Retrieve user by ID."""
        user = self.repo.get_by_id_with_role(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' was not found",
            )
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            role_id=user.role_id,
            role=user.role,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    def list_users(
        self,
        page: int = 1,
        page_size: int = 10,
        search: str | None = None,
        role_name: str | None = None,
    ) -> tuple[list[UserResponse], int]:
        """List users with pagination."""
        skip = (page - 1) * page_size
        users, total = self.repo.list_users(
            skip=skip, limit=page_size, search=search, role_name=role_name
        )
        responses = [
            UserResponse(
                id=u.id,
                email=u.email,
                username=u.username,
                first_name=u.first_name,
                last_name=u.last_name,
                role_id=u.role_id,
                role=u.role,
                full_name=u.full_name,
                is_active=u.is_active,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
            for u in users
        ]
        return responses, total

    def update_user(
        self,
        user_id: uuid.UUID,
        payload: UserUpdate,
        actor_id: uuid.UUID | None = None,
    ) -> UserResponse:
        """Update user profile or role."""
        user = self.repo.get_by_id_with_role(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if payload.first_name is not None:
            user.first_name = payload.first_name
        if payload.last_name is not None:
            user.last_name = payload.last_name
        if payload.email is not None:
            existing = self.repo.get_by_email(payload.email)
            if existing and existing.id != user_id:
                raise HTTPException(status_code=400, detail="Email is already used by another user")
            user.email = payload.email
        if payload.is_active is not None:
            user.is_active = payload.is_active
        if payload.password:
            user.password_hash = hash_password(payload.password)

        if payload.role_id:
            user.role_id = payload.role_id
        elif payload.role_name:
            role = self.db.query(Role).filter(Role.name == payload.role_name.upper()).first()
            if not role:
                raise HTTPException(
                    status_code=400, detail=f"Role '{payload.role_name}' does not exist"
                )
            user.role_id = role.id

        updated = self.repo.update(user)

        self.audit_service.log_action(
            action="USER_UPDATE",
            resource="USER",
            resource_id=str(user.id),
            user_id=actor_id,
        )

        return self.get_user_by_id(updated.id)

    def delete_user(self, user_id: uuid.UUID, actor_id: uuid.UUID | None = None) -> bool:
        """Delete user account."""
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        self.repo.delete(user_id)

        self.audit_service.log_action(
            action="USER_DELETE",
            resource="USER",
            resource_id=str(user_id),
            user_id=actor_id,
        )
        return True

    def list_doctors(self) -> list[UserResponse]:
        """List all active doctors."""
        doctors = self.repo.get_doctors()
        return [
            UserResponse(
                id=d.id,
                email=d.email,
                username=d.username,
                first_name=d.first_name,
                last_name=d.last_name,
                role_id=d.role_id,
                role="DOCTOR",
                full_name=d.full_name,
                is_active=d.is_active,
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
            for d in doctors
        ]
