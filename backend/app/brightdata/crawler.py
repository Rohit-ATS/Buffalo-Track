"""Crawl API: map one organization's site instead of guessing its URLs.

Once SERP has found an official foundation domain, the pages worth reading are
predictable -- /research, /registry, /natural-history-study, /grants, /contact
-- but their exact paths are not. Crawling the domain once and filtering by
keyword beats issuing twenty speculative searches, and costs less.

The filter is deliberately keyword-based rather than model-based: picking which
pages to pay tokens on should itself be free.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from urllib.parse import urlparse

from .client import BrightDataClient, BrightDataError
from .unlocker import content_hash

LOG = logging.getLogger(__name__)

# Path fragments that tend to hold reusable research infrastructure.
INTERESTING_PATH_WORDS = (
    "research",
    "registry",
    "natural-history",
    "naturalhistory",
    "study",
    "studies",
    "trial",
    "grant",
    "funding",
    "science",
    "biobank",
    "investigator",
    "researcher",
    "program",
    "project",
    "about",
    "contact",
    "partner",
    "collaborat",
)

# Pages that are never evidence about assets.
BORING_PATH_WORDS = (
    "privacy",
    "terms",
    "cookie",
    "donate",
    "shop",
    "store",
    "cart",
    "checkout",
    "login",
    "signin",
    "register-account",
    "unsubscribe",
    "/tag/",
    "/category/",
    "/author/",
    "/event",
    "/calendar",
)


@dataclass(frozen=True)
class CrawledPage:
    url: str
    domain: str
    title: str | None
    content: str
    content_hash: str
    content_chars: int
    method: str = "crawl"


def is_interesting(url: str) -> bool:
    """True when a path looks like it could describe an asset."""
    path = (urlparse(url).path or "/").lower()
    if any(word in path for word in BORING_PATH_WORDS):
        return False
    if path in {"", "/"}:
        return True  # the landing page usually names the organization
    return any(word in path for word in INTERESTING_PATH_WORDS)


def _domain_of(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


class CrawlClient:
    """Crawls a domain and returns the pages worth extracting from."""

    def __init__(self, client: BrightDataClient, zone: str) -> None:
        self._client = client
        self._zone = zone

    async def crawl(
        self, start_url: str, *, max_pages: int = 25, depth: int = 2
    ) -> list[CrawledPage]:
        """Crawls from start_url, keeping only interesting paths.

        Returns [] rather than raising when the crawl fails: a foundation site
        that blocks crawling should degrade to single-page Unlocker fetches,
        not kill the run.
        """
        try:
            response = await self._client.post(
                {
                    "zone": self._zone,
                    "url": start_url,
                    "format": "raw",
                    "data_format": "markdown",
                    "crawl": {"depth": depth, "limit": max_pages},
                }
            )
        except BrightDataError as error:
            LOG.warning("crawl failed for %s: %s", start_url, error)
            return []

        records = _decode_records(response.text)
        if not records:
            LOG.warning("crawl of %s returned no usable records", start_url)
            return []

        pages: list[CrawledPage] = []
        for record in records:
            url = record.get("url")
            body = record.get("markdown") or record.get("content") or record.get("text")
            if not isinstance(url, str) or not isinstance(body, str) or not body.strip():
                continue
            if not is_interesting(url):
                continue
            title = record.get("title")
            pages.append(
                CrawledPage(
                    url=url,
                    domain=_domain_of(url),
                    title=title if isinstance(title, str) else None,
                    content=body,
                    content_hash=content_hash(body),
                    content_chars=len(body),
                )
            )

        LOG.info("crawl %s -> %s pages kept of %s", start_url, len(pages), len(records))
        return pages


def _decode_records(text: str) -> list[dict[str, object]]:
    """Accepts a JSON array or newline-delimited JSON, which Crawl can return."""
    text = text.strip()
    if not text:
        return []

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        pass
    else:
        if isinstance(parsed, list):
            return [row for row in parsed if isinstance(row, dict)]
        if isinstance(parsed, dict):
            return [parsed]
        return []

    records: list[dict[str, object]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict):
            records.append(row)
    return records
