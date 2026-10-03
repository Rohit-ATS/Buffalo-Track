import hmac
import time
import uuid
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .atlas import AtlasRepository
from .config import Settings, get_settings
from .schemas import HealthResponse, ReadinessResponse, SearchRequest, SearchResponse


class SearchLimiter:
    """Per-process admission control for the public, database-backed search."""

    def __init__(self, *, limit: int, window_seconds: int, max_concurrency: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests: dict[str, deque[float]] = defaultdict(deque)
        self.max_concurrency = max_concurrency
        self.in_flight = 0

    def consume(self, identities: list[str]) -> int | None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        timestamps_by_identity = [self.requests[identity] for identity in dict.fromkeys(identities)]
        for timestamps in timestamps_by_identity:
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()
            if len(timestamps) >= self.limit:
                return max(1, int(self.window_seconds - (now - timestamps[0])) + 1)
        for timestamps in timestamps_by_identity:
            timestamps.append(now)
        return None

    def acquire_slot(self) -> bool:
        """Reserve a slot without an await between the check and increment."""
        if self.in_flight >= self.max_concurrency:
            return False
        self.in_flight += 1
        return True

    def release_slot(self) -> None:
        self.in_flight -= 1


def rate_limit_identities(request: Request, proxy_secret: str | None) -> list[str]:
    """Always enforce an IP quota; add a verified browser quota when present."""
    identities = [f"ip:{request.client.host if request.client else 'unknown'}"]
    client_id = request.headers.get("x-buffalo-client-id", "")
    signature = request.headers.get("x-buffalo-client-signature", "")
    if proxy_secret and len(client_id) == 36 and signature:
        try:
            uuid.UUID(client_id)
        except ValueError:
            pass
        else:
            expected = hmac.digest(proxy_secret.encode(), client_id.encode(), "sha256").hex()
            if hmac.compare_digest(expected, signature):
                identities.append(f"browser:{client_id}")
    return identities


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(10.0))
    yield
    await app.state.http.aclose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
    app.state.search_limiter = SearchLimiter(
        limit=settings.search_rate_limit,
        window_seconds=settings.search_rate_window_seconds,
        max_concurrency=settings.search_max_concurrency,
    )
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"], max_age=600)

    def repository(request: Request) -> AtlasRepository:
        return AtlasRepository(settings, request.app.state.http)

    @app.get("/healthz", response_model=HealthResponse, tags=["operations"])
    async def health() -> HealthResponse:
        return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment)

    @app.get("/readyz", response_model=ReadinessResponse, tags=["operations"])
    async def readiness() -> ReadinessResponse:
        if not settings.database_configured:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase is not configured")
        try:
            response = await app.state.http.get(
                f"{str(settings.supabase_url).rstrip('/')}/rest/v1/nodes",
                headers={"apikey": settings.supabase_service_role_key or ""},
                params={"select": "id", "limit": "1"},
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is unavailable",
            ) from error
        return ReadinessResponse(status="ready", database="connected")

    @app.post("/api/v1/search", response_model=SearchResponse, tags=["atlas"])
    async def search(
        payload: SearchRequest,
        request: Request,
        repo: AtlasRepository = Depends(repository),
    ) -> SearchResponse:
        if not settings.database_configured:
            return SearchResponse(status="unconfigured", query=payload.query)

        limiter: SearchLimiter = request.app.state.search_limiter
        retry_after = limiter.consume(rate_limit_identities(request, settings.backend_proxy_secret))
        if retry_after is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Search rate limit exceeded",
                headers={"Retry-After": str(retry_after)},
            )
        if not limiter.acquire_slot():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Search is busy; retry shortly",
                headers={"Retry-After": "1"},
            )
        try:
            return await repo.search(payload.query)
        finally:
            limiter.release_slot()

    return app


app = create_app()
