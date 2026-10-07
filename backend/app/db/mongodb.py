"""MongoDB client for unstructured clinical notes, model runs and audit trails."""

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
