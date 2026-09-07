from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import uuid
from datetime import datetime, timezone
from app.db.database import get_db_connection
from app.routers.auth import get_current_user
from app.core.security import get_password_hash

router = APIRouter(prefix="/api/users", tags=["System User Management"])

class CreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    department: str

@router.get("", summary="Get User Directory (System Admin Only)")
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "System Administrator":
        raise HTTPException(status_code=403, detail="Access denied. System Administrator role required.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, role, department, created_at FROM users")
    rows = cursor.fetchall()
    conn.close()

    users = [dict(r) for r in rows]

    return {
        "count": len(users),
        "users": users
    }

@router.post("", summary="Create New User Account (System Admin Only)")
async def create_user(request: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "System Administrator":
        raise HTTPException(status_code=403, detail="Access denied. System Administrator role required.")

    email_clean = request.email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email_clean,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    new_id = f"usr_{uuid.uuid4().hex[:8]}"
    hashed_pw = get_password_hash(request.password)
    now_iso = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (new_id, email_clean, hashed_pw, request.full_name, request.role, request.department, now_iso))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "id": new_id,
        "email": email_clean,
        "role": request.role
    }
