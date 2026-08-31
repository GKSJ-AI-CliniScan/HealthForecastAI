"""Request logging middleware."""

import time
import logging
from collections.abc import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("healthforecast.requests")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware recording HTTP request method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        response = await call_next(request)

        process_time = (time.perf_counter() - start_time) * 1000
        logger.info(
            "%s %s - %d (%.2fms)",
            method,
            path,
            response.status_code,
            process_time,
        )
        return response
