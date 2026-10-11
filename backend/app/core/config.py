"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object. Values come from the environment or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    APP_NAME: str = "HealthForecastAI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    # Databases
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/healthforecast"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "healthforecast"

    # CORS - comma separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ML
    MODEL_ARTIFACT_DIR: str = "ml/artifacts"
    ACTIVE_RISK_MODEL: str = "readmission_xgboost_v1"
    RISK_THRESHOLD_HIGH: float = 0.20
    RISK_THRESHOLD_MEDIUM: float = 0.12

    @field_validator("DATABASE_URL")
    @classmethod
    def require_psycopg3_dialect(cls, value: str) -> str:
        """Rewrite a bare postgresql:// URL to the psycopg 3 dialect.

        Hosted platforms hand out postgresql://, and SQLAlchemy routes that scheme
        to psycopg2 - which is not a dependency of this project, so the app dies on
        its first query with ModuleNotFoundError. Only psycopg 3 is installed.
        """
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @property
    def cors_origins(self) -> list[str]:
        """Return CORS origins as a list."""
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
