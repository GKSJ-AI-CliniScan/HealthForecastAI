import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.mongo import connect_to_mongo, close_mongo_connection
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.patients import router as patients_router
from app.routers.predictions import router as predictions_router
from app.routers.analytics import router as analytics_router
from app.routers.models_router import router as models_router
from app.routers.audit_logs import router as audit_logs_router
from app.routers.users import router as users_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("healthforecast_ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing HealthForecast AI Backend...")
    await connect_to_mongo()
    yield
    logger.info("Shutting down HealthForecast AI Backend...")
    await close_mongo_connection()

app = FastAPI(
    title="HEALTHFORECAST AI API",
    description="Hospital Readmission Prediction & Patient Risk Intelligence System Backend API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All System Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(predictions_router)
app.include_router(analytics_router)
app.include_router(models_router)
app.include_router(audit_logs_router)
app.include_router(users_router)

@app.get("/", summary="Root System Info")
async def root():
    return {
        "system": "HEALTHFORECAST AI",
        "description": "Hospital Readmission Prediction & Patient Risk Intelligence System",
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health"
    }
