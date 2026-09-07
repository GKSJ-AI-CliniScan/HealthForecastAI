import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.config import settings

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db = MongoDB()

async def connect_to_mongo():
    """Establish connection to MongoDB Atlas."""
    try:
        logger.info("Connecting to MongoDB Atlas...")
        db.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000
        )
        db.db = db.client[settings.DATABASE_NAME]
        # Ping server to confirm connection
        await db.client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB Atlas database: '{settings.DATABASE_NAME}'")
    except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
        logger.error(f"Failed to connect to MongoDB Atlas: {str(e)}")

async def close_mongo_connection():
    """Close MongoDB connection gracefully."""
    if db.client is not None:
        logger.info("Closing MongoDB Atlas connection...")
        db.client.close()
        logger.info("MongoDB Atlas connection closed.")

async def check_mongo_connection() -> dict:
    """Check health and ping response time of MongoDB Atlas."""
    if db.client is None:
        return {"status": "disconnected", "error": "Database client not initialized"}
    try:
        import time
        start_time = time.time()
        res = await db.client.admin.command('ping')
        latency_ms = round((time.time() - start_time) * 1000, 2)
        collections = await db.db.list_collection_names()
        return {
            "status": "connected",
            "database": settings.DATABASE_NAME,
            "ping": res,
            "latency_ms": latency_ms,
            "collections_count": len(collections),
            "collections": collections
        }
    except Exception as e:
        return {
            "status": "error",
            "database": settings.DATABASE_NAME,
            "error": str(e)
        }
