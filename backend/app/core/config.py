from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_url: str = Field(alias="DB_URL", default="")
    database_url: str = Field(alias="DATABASE_URL", default="")
    jwt_secret: str = Field(alias="JWT_SECRET", default="")
    secret_key: str = Field(alias="SECRET_KEY", default="")
    jwt_expiry_hours: int = Field(alias="JWT_EXPIRY", default=8)
    refresh_expiry_days: int = Field(alias="REFRESH_EXPIRY", default=30)
    api_prefix: str = Field(alias="API_PREFIX", default="/api/v1")
    cors_allowed_origins: str = Field(alias="CORS_ALLOWED_ORIGINS", default="http://localhost:5173")
    media_root: str = Field(alias="MEDIA_ROOT", default="media")

    @property
    def effective_jwt_secret(self) -> str:
        return self.jwt_secret or self.secret_key

    @property
    def effective_db_url(self) -> str:
        return self.db_url or self.database_url

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.effective_db_url:
        raise RuntimeError("DB_URL or DATABASE_URL must be set")
    if not settings.effective_jwt_secret:
        raise RuntimeError("JWT_SECRET or SECRET_KEY must be set")
    return settings
