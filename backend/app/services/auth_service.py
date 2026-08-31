"""Authentication Service."""

import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.role import Role
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RefreshTokenRequest, TokenResponse, UserMeResponse
from app.schemas.user import UserCreate
from app.services.audit_service import AuditService


class AuthService:
    """Service handling authentication, token generation, and account validation."""

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_service = AuditService(db)

    def authenticate_user(self, payload: LoginRequest) -> TokenResponse:
        """Authenticate with email/username and password, returning tokens."""
        user = self.user_repo.get_by_username_or_email(payload.username_or_email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated. Contact hospital administrator.",
            )

        # Audit login
        self.audit_service.log_action(
            action="LOGIN",
            resource="AUTH",
            resource_id=str(user.id),
            user_id=user.id,
        )

        role_name = user.role
        access_token = create_access_token(subject=str(user.id), role=role_name)
        refresh_token = create_refresh_token(subject=str(user.id), role=role_name)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def refresh_access_token(self, payload: RefreshTokenRequest) -> TokenResponse:
        """Issue new access token from valid refresh token."""
        decoded = decode_token(payload.refresh_token)
        if not decoded or decoded.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id_str = decoded.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        user = self.user_repo.get_by_id_with_role(uuid.UUID(user_id_str))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        role_name = user.role
        new_access_token = create_access_token(subject=str(user.id), role=role_name)
        new_refresh_token = create_refresh_token(subject=str(user.id), role=role_name)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def register_user(self, payload: UserCreate, creator_id: uuid.UUID | None = None) -> User:
        """Register a new user with role assignment."""
        if self.user_repo.get_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{payload.email}' is already registered",
            )

        if self.user_repo.get_by_username(payload.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{payload.username}' is already taken",
            )

        # Resolve role
        role_id = payload.role_id
        if not role_id and payload.role_name:
            role = self.db.query(Role).filter(Role.name == payload.role_name.upper()).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role '{payload.role_name}' does not exist",
                )
            role_id = role.id
        elif not role_id:
            # Default to DOCTOR
            default_role = self.db.query(Role).filter(Role.name == "DOCTOR").first()
            if not default_role:
                raise HTTPException(
                    status_code=500, detail="Default DOCTOR role missing in database"
                )
            role_id = default_role.id

        new_user = User(
            id=uuid.uuid4(),
            email=payload.email,
            username=payload.username,
            password_hash=hash_password(payload.password),
            first_name=payload.first_name,
            last_name=payload.last_name,
            role_id=role_id,
            is_active=True,
        )
        created_user = self.user_repo.create(new_user)

        self.audit_service.log_action(
            action="USER_CREATE",
            resource="USER",
            resource_id=str(created_user.id),
            user_id=creator_id or created_user.id,
        )

        return self.user_repo.get_by_id_with_role(created_user.id) or created_user

    def logout_user(self, current_user: User) -> dict[str, str]:
        """Record logout event."""
        self.audit_service.log_action(
            action="LOGOUT",
            resource="AUTH",
            resource_id=str(current_user.id),
            user_id=current_user.id,
        )
        return {"message": "Successfully logged out"}
