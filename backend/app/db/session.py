"""SQLAlchemy engine and session factory for PostgreSQL."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

database_url = make_url(settings.DATABASE_URL)

# psycopg3 starts caching server-side prepared statements after five repeats.
# A pooled proxy such as Supabase's transaction pooler routes successive
# queries to different backends, so the statement is gone when it is reused
# and every read endpoint starts erroring. Only PostgreSQL accepts the option.
# For Supabase compatibility, we also set connection limits for the free tier.
connect_args = {"prepare_threshold": 0} if database_url.get_backend_name() == "postgresql" else {}

# Pool settings optimized for production
# - pool_size: Maximum number of persistent connections
# - max_overflow: Extra connections beyond pool_size
# - pool_timeout: How long to wait for a connection
# - pool_recycle: Recycle connections after this many seconds (prevents stale connections)
engine = create_engine(
    database_url,
    pool_pre_ping=True,  # Test connections before using them
    pool_size=5,  # Default for Render free tier
    max_overflow=2,  # Allow burst traffic
    pool_timeout=30,  # Wait up to 30 seconds for connection
    pool_recycle=1800,  # Recycle connections after 30 minutes
    connect_args=connect_args,
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
