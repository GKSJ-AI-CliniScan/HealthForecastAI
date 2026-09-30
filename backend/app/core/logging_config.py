"""Structured application logging setup."""

import logging
import sys

from app.core.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def configure_logging() -> logging.Logger:
    """Configure the root logger and return the application logger."""
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    return logging.getLogger(settings.APP_NAME)


logger = configure_logging()
