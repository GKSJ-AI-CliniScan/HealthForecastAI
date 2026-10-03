"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object. Values come from the environment or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    APP_NAME: str = "HealthForecastAI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "change-me-do-not-use-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    # Databases
    DATABASE_URL: str = "sqlite:///./healthforecast.db"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "healthforecast"

    # Logging
    LOG_LEVEL: str = "INFO"

    # CORS - comma separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FRONTEND_URL: str | None = None

    # ML
    MODEL_ARTIFACT_DIR: str = "app/ml/models/saved"
    ACTIVE_RISK_MODEL: str = "readmission_model_v1"
    RISK_THRESHOLD_HIGH: float = 0.70
    RISK_THRESHOLD_MEDIUM: float = 0.40
    RISK_LOW_MAX: int = 25
    RISK_MEDIUM_MAX: int = 50
    RISK_HIGH_MAX: int = 75

    @property
    def normalized_database_url(self) -> str:
        """Ensure connection string uses psycopg3 driver for PostgreSQL / Neon."""
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    @property
    def cors_origins(self) -> list[str]:
        """Return CORS origins as a list."""
        origins = [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL.strip() not in origins:
            origins.append(self.FRONTEND_URL.strip())
        return origins


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
