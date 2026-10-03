from functools import lru_cache
from typing import Annotated

from pydantic import Field, HttpUrl, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables only."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Buffalo Track API"
    environment: str = "development"
    supabase_url: HttpUrl | None = None
    supabase_service_role_key: str | None = Field(default=None, min_length=1)
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:8080"],
    )

    # Bright Data: web discovery and difficult-page fetching. Runs from the
    # pipeline only, never from a browser.
    bright_data_api_key: str | None = Field(default=None, min_length=1)
    bright_data_serp_zone: str = "serp_api1"
    bright_data_unlocker_zone: str = "web_unlocker1"
    # Spend guard: the pipeline stops after this many billable Bright Data
    # requests in one run, so a loop cannot drain the credit balance.
    bright_data_max_requests: int = 200

    # Extraction model. Claims are rejected unless their quote verifies, so a
    # cheap tier is fine for bulk work.
    openai_api_key: str | None = Field(default=None, min_length=1)
    openai_extract_model: str = "gpt-4.1-mini"
    openai_prompt_version: str = "extract-v1"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return [origin.strip().rstrip("/") for origin in value if origin.strip()]

    @property
    def database_configured(self) -> bool:
        return self.supabase_url is not None and self.supabase_service_role_key is not None

    @property
    def bright_data_configured(self) -> bool:
        return self.bright_data_api_key is not None

    @property
    def openai_configured(self) -> bool:
        return self.openai_api_key is not None


@lru_cache
def get_settings() -> Settings:
    return Settings()
