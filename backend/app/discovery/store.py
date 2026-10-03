"""Write discovery output to Supabase over PostgREST.

Follows the pattern already in app/atlas.py: an explicit REST client with the
service-role key, no ORM. Writes need both `apikey` and `Authorization`, and
`Prefer: resolution=merge-duplicates` to make re-running a discovery pass
idempotent rather than a duplicate-key error.

Rejected claims are stored too, with their reason. The rejection rate is a
headline number on the methods page, and it cannot be computed from rows that
were thrown away.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from ..config import Settings

LOG = logging.getLogger(__name__)


class StoreError(RuntimeError):
    """A write to Supabase failed."""


@dataclass
class RunCounters:
    queries_run: int = 0
    urls_found: int = 0
    pages_fetched: int = 0
    claims_extracted: int = 0
    claims_verified: int = 0
    claims_rejected: int = 0


class DiscoveryStore:
    """Persists runs, SERP hits, pages, claims and promoted assets."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient) -> None:
        if not settings.database_configured:
            raise StoreError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set")
        key = settings.supabase_service_role_key or ""
        self._base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
        self._client = client
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    async def _insert(
        self, table: str, rows: list[dict[str, Any]], *, returning: bool = False, upsert: bool = False
    ) -> list[dict[str, Any]]:
        if not rows:
            return []

        prefer = ["return=representation" if returning else "return=minimal"]
        if upsert:
            prefer.append("resolution=merge-duplicates")

        response = await self._client.post(
            f"{self._base}/{table}",
            headers={**self._headers, "Prefer": ",".join(prefer)},
            json=rows,
            timeout=httpx.Timeout(30.0),
        )
        if response.status_code >= 400:
            raise StoreError(f"{table} insert failed ({response.status_code}): {response.text[:300]}")
        if not returning:
            return []
        payload = response.json()
        return payload if isinstance(payload, list) else []

    async def _patch(self, table: str, row_id: str, values: dict[str, Any]) -> None:
        response = await self._client.patch(
            f"{self._base}/{table}",
            headers={**self._headers, "Prefer": "return=minimal"},
            params={"id": f"eq.{row_id}"},
            json=values,
            timeout=httpx.Timeout(30.0),
        )
        if response.status_code >= 400:
            raise StoreError(f"{table} update failed ({response.status_code}): {response.text[:300]}")

    # ---------------------------------------------------------------- runs
    async def start_run(
        self, seed_term: str, *, disease_id: str | None, dry_run: bool
    ) -> str:
        rows = await self._insert(
            "atlas_discovery_runs",
            [{"seed_term": seed_term, "disease_id": disease_id, "dry_run": dry_run}],
            returning=True,
        )
        if not rows or "id" not in rows[0]:
            raise StoreError("Could not create a discovery run")
        return str(rows[0]["id"])

    async def finish_run(self, run_id: str, counters: RunCounters, *, notes: str | None = None) -> None:
        await self._patch(
            "atlas_discovery_runs",
            run_id,
            {
                "finished_at": "now()",
                "queries_run": counters.queries_run,
                "urls_found": counters.urls_found,
                "pages_fetched": counters.pages_fetched,
                "claims_extracted": counters.claims_extracted,
                "claims_verified": counters.claims_verified,
                "claims_rejected": counters.claims_rejected,
                "notes": notes,
            },
        )

    # ---------------------------------------------------------------- serp
    async def save_serp(self, run_id: str, hits: list[dict[str, Any]]) -> None:
        """Stores candidates with the classifier's verdict and reason."""
        await self._insert(
            "atlas_serp_results",
            [{**hit, "run_id": run_id} for hit in hits],
            upsert=True,
        )

    # ---------------------------------------------------------------- pages
    async def save_page(self, run_id: str, page: dict[str, Any]) -> str:
        """Upserts a fetched page by URL and returns its id."""
        rows = await self._insert(
            "atlas_web_sources",
            [{**page, "run_id": run_id}],
            returning=True,
            upsert=True,
        )
        if rows and "id" in rows[0]:
            return str(rows[0]["id"])

        # merge-duplicates can return nothing when the row was unchanged.
        existing = await self._client.get(
            f"{self._base}/atlas_web_sources",
            headers=self._headers,
            params={"select": "id", "url": f"eq.{page['url']}", "limit": "1"},
            timeout=httpx.Timeout(30.0),
        )
        existing.raise_for_status()
        found = existing.json()
        if isinstance(found, list) and found and "id" in found[0]:
            return str(found[0]["id"])
        raise StoreError(f"Could not resolve an id for {page['url']}")

    # ---------------------------------------------------------------- claims
    async def save_claims(self, run_id: str, claims: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Stores verified and rejected claims alike.

        Rejections are kept deliberately: the rejection rate is a headline
        number and cannot be computed from discarded rows.
        """
        return await self._insert(
            "atlas_web_claims",
            [{**claim, "run_id": run_id} for claim in claims],
            returning=True,
        )

    # ---------------------------------------------------------------- assets
    async def save_assets(self, assets: list[dict[str, Any]]) -> None:
        await self._insert("atlas_discovered_assets", assets, upsert=True)
