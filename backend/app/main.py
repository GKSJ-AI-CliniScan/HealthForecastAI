"""HealthForecast AI - FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Ensure any uncaught server exceptions still include valid CORS response headers."""
    logger.error("Unhandled server exception on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Check backend server logs."},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["System"], summary="Liveness probe")
def health() -> dict[str, str]:
    """Return the service status. Used by Docker, CI and the load balancer."""
    return {"status": "ok", "service": settings.APP_NAME, "environment": settings.ENVIRONMENT}


@app.get("/", tags=["System"], summary="Service banner")
def root() -> dict[str, str]:
    """Return a short banner pointing callers at the interactive docs."""
    return {"service": "HealthForecast AI", "version": app.version, "docs": "/docs"}
