from fastapi import APIRouter, HTTPException, Depends
from app.db.database import get_db_connection
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/audit-logs", tags=["Security Audit & Activity Logs"])

@router.get("", summary="Fetch Platform Audit Logs (System Admin Only)")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "System Administrator":
        raise HTTPException(status_code=403, detail="Access denied. System Administrator role required.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()

    logs = [dict(r) for r in rows]

    return {
        "count": len(logs),
        "logs": logs
    }
