"""Web Unlocker: fetch one page as markdown.

Markdown rather than HTML, for two reasons: it is far cheaper in tokens when
the page goes to the extraction model, and it keeps the quote verifier honest
-- the text a claim must match is the same text the model was shown.

The fetched body is hashed and stored. Re-running the verifier later, or
checking whether a foundation changed its registry page, needs no refetch.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from urllib.parse import urlparse

from .client import BrightDataClient, BrightDataError

LOG = logging.getLogger(__name__)

# Pages above this are almost always navigation dumps or search results; past
# this point we are paying tokens to read boilerplate.
MAX_CONTENT_CHARS = 200_000


@dataclass(frozen=True)
class FetchedPage:
    url: str
    domain: str
    content: str
    content_hash: str
    content_chars: int
    http_status: int
    method: str = "unlocker"
    truncated: bool = False


def content_hash(text: str) -> str:
    """Stable hash over normalised text, for change detection."""
    return hashlib.sha256(" ".join(text.split()).encode("utf-8")).hexdigest()


def _domain_of(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


class UnlockerClient:
    """Fetches pages through Bright Data's Web Unlocker zone."""

    def __init__(self, client: BrightDataClient, zone: str) -> None:
        self._client = client
        self._zone = zone

    async def fetch(self, url: str) -> FetchedPage | None:
        """Returns the page as markdown, or None if it came back empty.

        None rather than an exception for an empty body: one dead page in a
        discovery run is normal and should not abort the run.
        """
        try:
            response = await self._client.post(
                {
                    "zone": self._zone,
                    "url": url,
                    "format": "raw",
                    # Unlocker converts the rendered page server-side.
                    "data_format": "markdown",
                }
            )
        except BrightDataError as error:
            LOG.warning("unlocker failed for %s: %s", url, error)
            return None

        body = response.text or ""
        if not body.strip():
            LOG.warning("unlocker returned an empty body for %s", url)
            return None

        truncated = len(body) > MAX_CONTENT_CHARS
        if truncated:
            LOG.info("truncating %s from %s chars", url, len(body))
            body = body[:MAX_CONTENT_CHARS]

        return FetchedPage(
            url=url,
            domain=_domain_of(url),
            content=body,
            content_hash=content_hash(body),
            content_chars=len(body),
            http_status=response.status_code,
            truncated=truncated,
        )
