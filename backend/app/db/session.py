"""SQLAlchemy engine and session factory.

The engine is created on first use rather than at import time. Building it
eagerly means importing any module that touches the database - including a test
module - fails outright when the driver is missing or PostgreSQL is unreachable,
which turns a configuration problem into an import error far from its cause.
"""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


@lru_cache
def get_engine() -> Engine:
    """Return the process-wide engine, creating it on first call."""
    return create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)


@lru_cache
def get_sessionmaker() -> sessionmaker[Session]:
    """Return the process-wide session factory."""
    return sessionmaker(bind=get_engine(), autocommit=False, autoflush=False, future=True)


def SessionLocal() -> Session:  # noqa: N802 - name kept so existing imports keep working
    """Open a new database session."""
    return get_sessionmaker()()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
