from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def client(**overrides: object) -> TestClient:
    settings = Settings(**overrides)
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
