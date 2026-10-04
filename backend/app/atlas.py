import re
from typing import Any

import httpx

from .config import Settings
from .schemas import Connection, Match, NodeRef, SearchResponse

MAX_MATCHES = 6
MAX_CONNECTIONS = 12
_FILTER_CHARS = re.compile(r'[,()"\'\\*%]')


def sanitize_query(raw: str) -> str:
    return " ".join(_FILTER_CHARS.sub(" ", raw).split())[:80]


class AtlasRepository:
    """Small, explicit REST client for the existing Supabase graph tables."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient):
        self.client = client
        self.base_url = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
        self.headers = {"apikey": settings.supabase_service_role_key or ""}

    async def _get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = await self.client.get(f"{self.base_url}/{table}", headers=self.headers, params=params)
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, list):
            raise ValueError(f"Unexpected {table} response")
        return result

    async def find_nodes(self, term: str) -> list[dict[str, Any]]:
        for pattern in (term, f"{term}%", f"%{term}%"):
            rows = await self._get(
                "nodes",
                {
                    "select": "id,type,name",
                    "or": f"(name.ilike.{pattern},type.ilike.{pattern})",
                    "limit": str(MAX_MATCHES),
                },
            )
            if rows:
                return rows
        return []

    async def search(self, raw_query: str) -> SearchResponse:
        term = sanitize_query(raw_query)
        if not term:
            return SearchResponse(status="empty", query=raw_query)
        try:
            nodes = await self.find_nodes(term)
            if not nodes:
                return SearchResponse(status="empty", query=term)
            best, *rest = nodes
            node_id = best["id"]
            edges = await self._load_edges(node_id)
            connections = await self._connections(node_id, edges)
            return SearchResponse(
                status="ok",
                query=term,
                match=Match(
                    node=NodeRef(**best),
                    connections=connections,
                    # Generic evidence is intentionally reviewer-only. This public
                    # endpoint never queries it with its service-role credential.
                    evidence=[],
                ),
                alsoMatched=[NodeRef(**node) for node in rest],
            )
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            return SearchResponse(status="error", query=term, message="The atlas database is temporarily unavailable.")

    async def check_query_path(self) -> None:
        """Exercise the exact request shapes `search()` depends on.

        `/readyz` used to ping only `nodes` with no filter, which stayed green
        through the entire outage where every real search failed: the broken
        step was the `or`-filtered `edges` lookup, which that check never ran.
        A random UUID matches nothing, so this proves PostgREST accepts the
        filter's syntax -- the thing that was actually broken -- without
        depending on any particular row existing.
        """
        await self._get("nodes", {"select": "id", "limit": "1"})
        probe_id = "00000000-0000-0000-0000-000000000000"
        await self._get(
            "edges",
            {
                "select": "id",
                "or": f"(source_id.eq.{probe_id},target_id.eq.{probe_id})",
                "limit": "1",
            },
        )

    async def _load_edges(self, node_id: str) -> list[dict[str, Any]]:
        return await self._get(
            "edges",
            {
                "select": "id,source_id,target_id,type,weight",
                # PostgREST requires the or-list to be wrapped in parentheses
                # (see find_nodes above, which gets this right). Without them,
                # PostgREST returns 400 for every edge lookup, _get raises,
                # search() catches it as a generic error, and a node that
                # really has edges comes back looking like it has none -- while
                # /readyz, which only pings `nodes`, stays green throughout.
                "or": f"(source_id.eq.{node_id},target_id.eq.{node_id})",
                "order": "weight.desc",
                "limit": str(MAX_CONNECTIONS),
            },
        )

    async def _connections(self, node_id: str, edges: list[dict[str, Any]]) -> list[Connection]:
        if not edges:
            return []
        neighbor_ids = {edge["target_id"] if edge["source_id"] == node_id else edge["source_id"] for edge in edges}
        neighbor_rows = await self._get(
            "nodes",
            {"select": "id,type,name", "id": f"in.({','.join(neighbor_ids)})"},
        )
        neighbors = {row["id"]: NodeRef(**row) for row in neighbor_rows}
        result: list[Connection] = []
        for edge in edges:
            outgoing = edge["source_id"] == node_id
            neighbor = neighbors.get(edge["target_id"] if outgoing else edge["source_id"])
            if neighbor:
                result.append(
                    Connection(
                        edgeId=edge["id"],
                        type=edge["type"],
                        weight=edge["weight"],
                        direction="outgoing" if outgoing else "incoming",
                        neighbor=neighbor,
                        evidenceCount=0,
                    )
                )
        return result
