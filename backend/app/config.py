from functools import lru_cache

from pydantic import Field, HttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables only."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Buffalo Track API"
    environment: str = "development"
    supabase_url: HttpUrl | None = None
    supabase_service_role_key: str | None = Field(default=None, min_length=1)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:8080"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return [origin.strip().rstrip("/") for origin in value if origin.strip()]

    @property
    def database_configured(self) -> bool:
        return self.supabase_url is not None and self.supabase_service_role_key is not None


@lru_cache
def get_settings() -> Settings:
    return Settings()
