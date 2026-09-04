"""MongoDB client for unstructured clinical notes and model-run logs.

Audit logs are not stored here: they live in PostgreSQL as the
``AuditLog`` ORM model (``app/models/audit_log.py``), so ``actor_id`` stays a
real foreign key into ``users`` even as accounts are soft-deleted, and so the
same relational session that already loaded the caller's account can write
the entry without a second connection.
"""

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import settings

_client: MongoClient | None = None


def get_mongo_client() -> MongoClient:
    """Return a lazily created MongoDB client."""
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_mongo_db() -> Database:
    """Return the application MongoDB database handle."""
    return get_mongo_client()[settings.MONGO_DB]
