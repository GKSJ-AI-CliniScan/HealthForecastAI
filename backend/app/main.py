"""HealthForecast AI - FastAPI Application Entrypoint."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.middleware.exception_handler import register_exception_handlers
from app.middleware.logging import LoggingMiddleware

# Configure root logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("healthforecast.main")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Run startup and shutdown lifecycle hooks."""
    logger.info("Initializing %s in %s mode", settings.APP_NAME, settings.ENVIRONMENT)
    # Ensure database schema is ready
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Gracefully shutting down %s", settings.APP_NAME)


app = FastAPI(
    title="HealthForecast AI",
    description=(
        "Hospital Readmission Prediction & Patient Risk Intelligence System. "
        "Milestone 1 Core Architecture, Authentication, RBAC, Patient Management & Clinical Foundation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Exception handling
register_exception_handlers(app)

# Middlewares
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["System"], summary="Liveness Probe")
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["System"], summary="API v1 Health")
def health() -> dict[str, str]:
    """Health check endpoint for Docker and monitoring."""
    return {"status": "ok", "service": settings.APP_NAME, "environment": settings.ENVIRONMENT}


@app.get("/", tags=["System"], summary="Service Banner")
def root() -> dict[str, str]:
    """Root banner pointing to interactive Swagger documentation."""
    return {"service": "HealthForecast AI", "version": app.version, "docs": "/docs"}

