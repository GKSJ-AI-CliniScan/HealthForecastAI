"""Auth service - business logic layer.

Handles user credential verification and access token issuance.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserLogin


def authenticate_user(db: Session, payload: UserLogin) -> Token:
    """Authenticate a user against the database and issue a signed JWT."""
    # 1. Query user by email
    user = db.query(User).filter(User.email == payload.email).first()

    # 2. Check if user exists and password hash matches
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check if user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    # 4. Resolve user role and permissions
    try:
        user_role = Role(user.role)
    except ValueError:
        user_role = Role.DOCTOR

    permissions = [str(p) for p in permissions_for(user_role)]

    # 5. Create signed access token
    access_token = create_access_token(
        subject=str(user.id),
        role=str(user_role),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=str(user_role),
        permissions=permissions,
    )
