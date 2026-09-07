from datetime import datetime, timezone
from fastapi import APIRouter
from app.db.mongo import check_mongo_connection
from app.config import settings

router = APIRouter(prefix="/api", tags=["Health & System"])

@router.get("/health", summary="Backend & MongoDB Atlas Health Check")
async def health_check():
    """
    Returns platform health status including MongoDB Atlas connection details.
    """
    mongo_health = await check_mongo_connection()
    
    is_healthy = mongo_health.get("status") == "connected"
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": "HealthForecast AI Backend API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": mongo_health,
        "cors_origins": settings.cors_origins
    }
