from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional
import sqlite3
from app.db.database import get_db_connection
from app.core.security import verify_password, create_access_token, decode_access_token, get_password_hash

router = APIRouter(prefix="/api/auth", tags=["Authentication & Access"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_email = payload["sub"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (user_email.strip(),))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)

    raise HTTPException(status_code=404, detail="User account not found")

@router.post("/login", response_model=LoginResponse, summary="User Authentication & JWT Issuance")
async def login(credentials: LoginRequest):
    email_clean = credentials.email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (email_clean,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password"
        )

    user = dict(row)

    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password"
        )

    token_payload = {
        "sub": user["email"],
        "role": user["role"],
        "user_id": user["id"]
    }

    access_token = create_access_token(token_payload)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            department=user.get("department", "Healthcare Services")
        )
    )

@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User Profile")
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        department=current_user.get("department", "Healthcare Services")
    )
