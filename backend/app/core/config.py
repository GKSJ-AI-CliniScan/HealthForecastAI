"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDER_ANONYMISATION_SALT = "change-me-do-not-use-in-production"


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

    # CORS - comma separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # ML
    MODEL_ARTIFACT_DIR: str = "ml/artifacts"
    ACTIVE_RISK_MODEL: str = "readmission_xgboost_v1"
    RISK_THRESHOLD_HIGH: float = 0.70
    RISK_THRESHOLD_MEDIUM: float = 0.40

    # Research analytics - salt for app.utils.anonymisation.pseudonymise().
    # Must be overridden via environment/.env in any real deployment; kept
    # separate from SECRET_KEY so rotating one never invalidates the other.
    ANONYMISATION_SALT: str = PLACEHOLDER_ANONYMISATION_SALT
    RESEARCH_MIN_COHORT_SIZE: int = Field(default=10, ge=1)

    # Reporting - generated export files live on local disk under this
    # directory (relative paths resolve against the working directory, as
    # MODEL_ARTIFACT_DIR does). Reports older than the retention window are
    # removed by the purge endpoint.
    REPORT_STORAGE_DIR: str = "storage/reports"
    REPORT_RETENTION_DAYS: int = Field(default=30, ge=1)

    @model_validator(mode="after")
    def _require_real_salt_in_production(self) -> "Settings":
        # Pseudonyms hash sequential integer ids, so anyone who knows the
        # published placeholder salt can rebuild the id -> pseudonym table.
        if (
            self.ENVIRONMENT.lower() == "production"
            and self.ANONYMISATION_SALT == PLACEHOLDER_ANONYMISATION_SALT
        ):
            raise ValueError("ANONYMISATION_SALT must be set to a secret value in production")
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
