import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb+srv://padharthidhanalakshmi_db_user:12ikStIgljXUNJa0@cluster0.wnx5exe.mongodb.net/?appName=Cluster0"
    )
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "HealthForecastAI")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "healthforecast_ai_secret_key_super_secure_jwt_2026")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
