"""Global exception handlers for standardized JSON error responses."""

import logging
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("healthforecast.exceptions")


def register_exception_handlers(app: FastAPI) -> None:
    """Register uniform exception handlers onto the FastAPI application."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        logger.warning(
            "HTTPException: %s status=%d path=%s",
            exc.detail,
            exc.status_code,
            request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail,
                "error_code": f"HTTP_{exc.status_code}",
            },
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        first_msg = errors[0].get("msg") if errors else "Validation failed"
        field = ".".join(str(loc) for loc in errors[0].get("loc", [])) if errors else ""
        detailed_msg = f"{field}: {first_msg}" if field else first_msg

        logger.warning("Validation error on %s: %s", request.url.path, detailed_msg)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": detailed_msg,
                "error_code": "VALIDATION_ERROR",
                "details": errors,
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error("Database error on %s: %s", request.url.path, str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "A database operation error occurred. Please try again.",
                "error_code": "DATABASE_ERROR",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception on %s: %s", request.url.path, str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "An unexpected internal server error occurred.",
                "error_code": "INTERNAL_SERVER_ERROR",
            },
        )
