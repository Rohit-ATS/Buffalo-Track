"""SERP API: find candidate pages.

This is discovery, not evidence. A SERP hit means "a search engine thinks this
URL is about the term" -- nothing more. Results go through the domain
classifier, then the accepted ones get fetched, extracted and quote-verified
before anything reaches the graph.

Bright Data's SERP zone takes a search-engine URL and returns the rendered
result page; asking for `brd_json=1` makes it return parsed results instead of
HTML, which saves writing a brittle SERP parser.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from urllib.parse import quote_plus, urlparse

from .client import BrightDataClient

LOG = logging.getLogger(__name__)


@dataclass(frozen=True)
class SerpHit:
    """One candidate URL from one query."""

    query: str
    url: str
    domain: str
    title: str | None
    snippet: str | None
    rank: int


def _domain_of(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _search_url(query: str, *, count: int, country: str) -> str:
    # brd_json=1 asks the SERP zone for parsed JSON rather than raw HTML.
    return (
        f"https://www.google.com/search?q={quote_plus(query)}"
        f"&num={count}&gl={country}&hl=en&brd_json=1"
    )


def _parse_organic(payload: dict[str, object], query: str) -> list[SerpHit]:
    """Pulls organic results out of a parsed SERP payload.

    Bright Data has used `organic` and `organic_results` across versions, so
    accept either rather than breaking on a rename.
    """
    organic = payload.get("organic") or payload.get("organic_results") or []
    if not isinstance(organic, list):
        return []

    hits: list[SerpHit] = []
    for index, raw in enumerate(organic):
        if not isinstance(raw, dict):
            continue
        url = raw.get("link") or raw.get("url")
        if not isinstance(url, str) or not url.startswith("http"):
            continue
        title = raw.get("title")
        snippet = raw.get("description") or raw.get("snippet")
        rank_raw = raw.get("rank") or raw.get("position")
        rank = rank_raw if isinstance(rank_raw, int) else index + 1
        hits.append(
            SerpHit(
                query=query,
                url=url,
                domain=_domain_of(url),
                title=title if isinstance(title, str) else None,
                snippet=snippet if isinstance(snippet, str) else None,
                rank=rank,
            )
        )
    return hits


class SerpClient:
    """Runs discovery searches through Bright Data's SERP zone."""

    def __init__(self, client: BrightDataClient, zone: str) -> None:
        self._client = client
        self._zone = zone

    async def search(self, query: str, *, count: int = 10, country: str = "us") -> list[SerpHit]:
        """Returns organic hits for one query, or [] if the payload is unusable."""
        response = await self._client.post(
            {
                "zone": self._zone,
                "url": _search_url(query, count=count, country=country),
                "format": "raw",
            }
        )

        try:
            payload = response.json()
        except json.JSONDecodeError:
            LOG.warning("SERP payload for %r was not JSON; skipping", query)
            return []

        if not isinstance(payload, dict):
            LOG.warning("SERP payload for %r was not an object; skipping", query)
            return []

        hits = _parse_organic(payload, query)
        LOG.info("SERP %r -> %s hits", query, len(hits))
        return hits

    async def search_many(
        self, queries: list[str], *, count: int = 10
    ) -> list[SerpHit]:
        """Runs queries in sequence, deduplicating URLs across them.

        Sequential on purpose: the budget guard is per-request, and a burst of
        parallel searches can blow past the cap before the first one returns.
        """
        seen: set[str] = set()
        out: list[SerpHit] = []
        for query in queries:
            for hit in await self.search(query, count=count):
                if hit.url in seen:
                    continue
                seen.add(hit.url)
                out.append(hit)
        return out
