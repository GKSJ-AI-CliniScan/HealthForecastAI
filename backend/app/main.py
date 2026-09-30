"""HealthForecast AI - FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import RequestResponseEndpoint

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
    # The interactive docs list every endpoint; keep them out of production.
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """Add the headers that make a browser treat API responses carefully.

    Patient data must not be cached by a browser or shared proxy, so API responses
    are marked no-store. The docs pages are left cacheable.
    """
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.url.path.startswith(settings.API_V1_PREFIX):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["System"], summary="Liveness probe")
def health() -> dict[str, str]:
    """Return the service status. Used by Docker, CI and the load balancer."""
    return {"status": "ok", "service": settings.APP_NAME, "environment": settings.ENVIRONMENT}


@app.get("/", tags=["System"], summary="Service banner")
def root() -> dict[str, str]:
    """Return a short banner pointing callers at the interactive docs."""
    return {"service": "HealthForecast AI", "version": app.version, "docs": "/docs"}
