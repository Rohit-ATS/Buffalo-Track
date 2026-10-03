import asyncio
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.atlas import AtlasRepository
from app.config import Settings
from app.main import create_app


def client(**overrides: object) -> TestClient:
    # _env_file=None keeps the developer's .env out of the test run: otherwise a
    # local SUPABASE_URL leaks in and the suite passes or fails by machine.
    settings = Settings(_env_file=None, **overrides)
    return TestClient(create_app(settings))


def test_health_is_available_without_database_credentials() -> None:
    with client() as api:
        response = api.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_requires_database_credentials() -> None:
    with client() as api:
        response = api.get("/readyz")
    assert response.status_code == 503


def test_search_reports_unconfigured_without_database_credentials() -> None:
    with client() as api:
        response = api.post("/api/v1/search", json={"query": "STXBP1"})
    assert response.status_code == 200
    assert response.json() == {"status": "unconfigured", "query": "STXBP1", "message": None, "match": None, "alsoMatched": None}


def test_cors_allows_configured_frontend_only() -> None:
    with client(cors_origins=["https://atlas.example.org"]) as api:
        allowed = api.options("/api/v1/search", headers={"Origin": "https://atlas.example.org", "Access-Control-Request-Method": "POST"})
        blocked = api.options("/api/v1/search", headers={"Origin": "https://other.example.org", "Access-Control-Request-Method": "POST"})
    assert allowed.headers["access-control-allow-origin"] == "https://atlas.example.org"
    assert blocked.status_code == 400


def test_comma_separated_cors_origins_load_from_dotenv(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("CORS_ORIGINS=http://localhost:8080,https://atlas.example.org\n")
    settings = Settings(_env_file=env_file)
    assert settings.cors_origins == ["http://localhost:8080", "https://atlas.example.org"]


def test_search_returns_live_graph_data_from_supabase() -> None:
    calls: list[httpx.Request] = []

    def supabase(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        params = request.url.params
        if request.url.path.endswith("/nodes") and "or" in params:
            return httpx.Response(200, json=[
                {"id": "n1", "type": "gene", "name": "STXBP1"},
                {"id": "n4", "type": "disorder", "name": "STXBP1-related disorder"},
            ])
        if request.url.path.endswith("/edges"):
            return httpx.Response(200, json=[
                {"id": "e1", "source_id": "n1", "target_id": "n2", "type": "acts_in", "weight": 0.95},
                {"id": "e2", "source_id": "n3", "target_id": "n1", "type": "shares_mechanism", "weight": 0.8},
            ])
        if request.url.path.endswith("/nodes"):
            return httpx.Response(200, json=[
                {"id": "n2", "type": "mechanism", "name": "Presynaptic vesicle fusion"},
                {"id": "n3", "type": "disorder", "name": "STX1B-related epilepsy"},
            ])
        if request.url.path.endswith("/evidence") and "node_id" in params:
            return httpx.Response(200, json=[
                {"id": "ev1", "content": "Source-backed statement.", "source_url": "https://example.org/paper", "confidence": 0.9},
            ])
        return httpx.Response(200, json=[{"edge_id": "e1"}, {"edge_id": "e1"}, {"edge_id": "e2"}])

    async def run() -> object:
        transport = httpx.MockTransport(supabase)
        async with httpx.AsyncClient(transport=transport) as http:
            repo = AtlasRepository(
                Settings(supabase_url="https://project.supabase.co", supabase_service_role_key="secret"),
                http,
            )
            return await repo.search(" STXBP1 ")

    result = asyncio.run(run())
    assert result.status == "ok"
    assert result.query == "STXBP1"
    assert result.match is not None
    assert result.match.node.name == "STXBP1"
    assert result.match.connections[0].evidenceCount == 2
    assert result.match.connections[1].direction == "incoming"
    assert str(result.match.evidence[0].sourceUrl) == "https://example.org/paper"
    assert calls[0].headers["apikey"] == "secret"
