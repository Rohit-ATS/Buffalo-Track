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

    # Extraction model. The model only reads and copies, and anything it
    # invents is discarded by the verifier, so the cheapest current tier is the
    # right one: Claude Haiku 4.5 at $1/$5 per MTok.
    anthropic_api_key: str | None = Field(default=None, min_length=1)
    anthropic_extract_model: str = "claude-haiku-4-5"
    anthropic_prompt_version: str = "extract-v1"

    @field_validator(
        "supabase_url",
        "supabase_service_role_key",
        "bright_data_api_key",
        "anthropic_api_key",
        mode="before",
    )
    @classmethod
    def blank_is_unset(cls, value: object) -> object:
        """Treat an empty or placeholder value as absent.

        `cp .env.example .env` leaves `OPENAI_API_KEY=` and
        `SUPABASE_URL=https://<project-ref>.supabase.co` behind. Those are not
        configuration, they are a to-do list, and min_length=1 rejected them
        with a validation error instead of letting the pipeline report which
        credential is missing.
        """
        if not isinstance(value, str):
            return value
        cleaned = value.strip()
        if not cleaned:
            return None
        # Unfilled placeholder from .env.example, e.g. <project-ref>.
        if "<" in cleaned and ">" in cleaned:
            return None
        return cleaned

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
    def anthropic_configured(self) -> bool:
        return self.anthropic_api_key is not None


@lru_cache
def get_settings() -> Settings:
    return Settings()
