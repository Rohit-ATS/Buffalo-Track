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


def _dedupe(rows: list[dict[str, Any]], key: tuple[str, ...]) -> list[dict[str, Any]]:
    """Keeps the first row for each key tuple, preserving order."""
    seen: set[tuple[Any, ...]] = set()
    out: list[dict[str, Any]] = []
    for row in rows:
        identity = tuple(row.get(part) for part in key)
        if identity in seen:
            continue
        seen.add(identity)
        out.append(row)
    return out


def _align_keys(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Gives every row in a batch the same keys, filling gaps with None.

    PostgREST rejects a multi-row insert whose objects differ in shape --
    "All object keys must match" (PGRST102) -- and our rows legitimately do:
    a verified claim carries confidence and rule, a rejected one carries
    reject_reason instead. Padding here keeps that difference expressible at
    the call site without every caller having to remember the rule.
    """
    if len(rows) < 2:
        return rows

    keys: set[str] = set()
    for row in rows:
        keys.update(row)

    return [{key: row.get(key) for key in keys} for row in rows]


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
        self,
        table: str,
        rows: list[dict[str, Any]],
        *,
        returning: bool = False,
        upsert: bool = False,
        on_conflict: str | None = None,
    ) -> list[dict[str, Any]]:
        if not rows:
            return []

        rows = _align_keys(rows)
        prefer = ["return=representation" if returning else "return=minimal"]
        if upsert:
            prefer.append("resolution=merge-duplicates")

        # merge-duplicates only resolves against the primary key unless the
        # conflicting columns are named, so a unique constraint like
        # atlas_web_sources.url still raises 23505 without this.
        params = {"on_conflict": on_conflict} if on_conflict else None

        response = await self._client.post(
            f"{self._base}/{table}",
            headers={**self._headers, "Prefer": ",".join(prefer)},
            params=params,
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
            on_conflict="run_id,query,url",
        )

    # ---------------------------------------------------------------- pages
    async def save_page(self, run_id: str, page: dict[str, Any]) -> str:
        """Upserts a fetched page by URL and returns its id."""
        rows = await self._insert(
            "atlas_web_sources",
            [{**page, "run_id": run_id}],
            returning=True,
            upsert=True,
            on_conflict="url",
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
        # One page often yields two claims naming the same asset. Postgres
        # refuses an upsert that would touch a row twice in one command
        # (21000), so collapse them here -- keeping the first, which is the
        # higher-confidence claim since _judge preserves extraction order.
        deduped = _dedupe(assets, ("source_id", "kind", "name"))
        await self._insert(
            "atlas_discovered_assets", deduped, upsert=True, on_conflict="source_id,kind,name"
        )
