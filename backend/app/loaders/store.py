"""Writes loader output to Supabase over PostgREST.

Same pattern as app/discovery/store.py: an explicit REST client with the
service-role key, no ORM, `Prefer: resolution=merge-duplicates` so re-running
a loader is idempotent rather than a duplicate-key error.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from ..config import Settings

LOG = logging.getLogger(__name__)


class StoreError(RuntimeError):
    """A write to Supabase failed."""


class LoaderStore:
    """Upserts into the atlas_* tables the external-data loaders fill."""

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

    async def upsert(self, table: str, rows: list[dict[str, Any]], *, on_conflict: str | None = None) -> None:
        """Inserts rows, merging on conflict so a rerun updates rather than duplicates."""
        if not rows:
            return
        params = {"on_conflict": on_conflict} if on_conflict else {}
        response = await self._client.post(
            f"{self._base}/{table}",
            headers={**self._headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
            params=params,
            json=rows,
            timeout=httpx.Timeout(30.0),
        )
        if response.status_code >= 400:
            raise StoreError(f"{table} upsert failed ({response.status_code}): {response.text[:300]}")

    async def patch_field(self, table: str, row_id: str, values: dict[str, Any]) -> None:
        """Backfills columns on an existing row, by primary key `id`."""
        response = await self._client.patch(
            f"{self._base}/{table}",
            headers={**self._headers, "Prefer": "return=minimal"},
            params={"id": f"eq.{row_id}"},
            json=values,
            timeout=httpx.Timeout(30.0),
        )
        if response.status_code >= 400:
            raise StoreError(f"{table} patch failed ({response.status_code}): {response.text[:300]}")

    async def get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = await self._client.get(
            f"{self._base}/{table}", headers=self._headers, params=params, timeout=httpx.Timeout(30.0)
        )
        if response.status_code >= 400:
            raise StoreError(f"{table} read failed ({response.status_code}): {response.text[:300]}")
        result = response.json()
        return result if isinstance(result, list) else []
