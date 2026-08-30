"""HealthForecast AI - FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging_config import logger


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Run startup and shutdown hooks for the application."""
    logger.info("Starting %s in %s mode", settings.APP_NAME, settings.ENVIRONMENT)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title="HealthForecast AI",
    description=(
        "Hospital Readmission Prediction & Patient Risk Intelligence System. "
        "Predicts readmissions, identifies high risk patients, evaluates treatment "
        "effectiveness and supports proactive care planning."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Mount static dashboards if available
_static_dashboards_dir = Path(__file__).resolve().parents[2] / "static" / "dashboards"
if _static_dashboards_dir.is_dir():
    app.mount(
        "/dashboards",
        StaticFiles(directory=str(_static_dashboards_dir), html=True),
        name="dashboards",
    )


@app.get("/health", tags=["System"], summary="Liveness probe")
def health() -> dict[str, str]:
    """Return the service status. Used by Docker, CI and the load balancer."""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["System"], summary="Service banner")
def root() -> dict[str, str]:
    """Return a short banner pointing callers at the interactive docs and dashboards."""
    return {
        "service": "HealthForecast AI",
        "version": app.version,
        "docs": "/docs",
        "dashboards": "/dashboards/",
    }
