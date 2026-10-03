from functools import lru_cache
from typing import Annotated

from pydantic import Field, HttpUrl, field_validator, model_validator
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
    # Public search protection. Render runs one API instance (render.yaml), so
    # these values bound the deployed service as well as the local process.
    search_rate_limit: int = Field(default=30, ge=1, le=10_000)
    search_rate_window_seconds: int = Field(default=60, ge=1, le=3_600)
    search_max_concurrency: int = Field(default=8, ge=1, le=1_000)
    backend_proxy_secret: str | None = Field(default=None, min_length=32)

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

    @field_validator("supabase_url", mode="before")
    @classmethod
    def normalize_supabase_url(cls, value: object) -> object:
        """Accept a bare host, and reject the Postgres host with an explanation.

        Two easy mistakes: pasting `<ref>.supabase.co` without a scheme, and
        pasting `db.<ref>.supabase.co` from the connection-string panel. The
        second is the direct Postgres host, not the Data API, so adding a scheme
        would produce a URL that resolves but serves nothing.
        """
        if not isinstance(value, str) or not value.strip():
            return value

        candidate = value.strip()
        host = candidate.split("://", 1)[-1].split("/", 1)[0].lower()

        if host.startswith("db.") and host.endswith(".supabase.co"):
            ref = host[3:-len(".supabase.co")]
            raise ValueError(
                f"SUPABASE_URL is the Postgres host ({host}), not the Data API URL. "
                f"Use https://{ref}.supabase.co and keep the db host for DATABASE_URL."
            )

        if "://" not in candidate:
            return f"https://{candidate}"
        return candidate

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return [origin.strip().rstrip("/") for origin in value if origin.strip()]

    @model_validator(mode="after")
    def require_proxy_secret_in_production(self) -> "Settings":
        if self.environment == "production" and self.database_configured and not self.backend_proxy_secret:
            raise ValueError(
                "BACKEND_PROXY_SECRET is required in production when Supabase is configured. "
                "Set the same random value in the frontend server environment."
            )
        return self

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
