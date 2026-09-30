"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import model_validator
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
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/healthforecast"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "healthforecast"

    # Seconds to cache whole-hospital aggregate reports. 0 disables the cache.
    CACHE_TTL_SECONDS: int = 60

    # CORS - comma separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # ML
    MODEL_ARTIFACT_DIR: str = "ml/artifacts"
    ACTIVE_RISK_MODEL: str = "readmission_xgboost_v1"
    RISK_THRESHOLD_HIGH: float = 0.20
    RISK_THRESHOLD_MEDIUM: float = 0.12

    @model_validator(mode="after")
    def refuse_unsafe_production(self) -> "Settings":
        """Refuse to start in production with a development configuration.

        A default signing key means anyone who has read the repository can forge a
        token for any role. Better a container that will not start than one that
        starts and quietly accepts them.
        """
        if self.ENVIRONMENT.lower() != "production":
            return self
        problems = []
        if self.DEBUG:
            problems.append("DEBUG must be false")
        if self.SECRET_KEY.startswith("change-me") or len(self.SECRET_KEY) < 32:
            problems.append("SECRET_KEY must be a random value of at least 32 characters")
        if "*" in self.cors_origins:
            problems.append("BACKEND_CORS_ORIGINS must list real origins, not *")
        if problems:
            raise ValueError("Unsafe production configuration: " + "; ".join(problems))
        return self

    @property
    def cors_origins(self) -> list[str]:
        """Return CORS origins as a list."""
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
