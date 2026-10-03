from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .atlas import AtlasRepository
from .config import Settings, get_settings
from .schemas import HealthResponse, ReadinessResponse, SearchRequest, SearchResponse


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(10.0))
    yield
    await app.state.http.aclose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
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
    async def search(payload: SearchRequest, repo: AtlasRepository = Depends(repository)) -> SearchResponse:
        if not settings.database_configured:
            return SearchResponse(status="unconfigured", query=payload.query)
        return await repo.search(payload.query)

    return app


app = create_app()
