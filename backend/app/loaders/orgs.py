"""Organizations: link health-check for the curated patient-group URLs.

There's no single official API or bulk file for "patient organizations" the
way there is for the other seven sources -- registries like NORD and Orphanet
exist but aren't comprehensive or consistently structured enough to treat as
canonical here, and the plan's loader-file list names a loader, not a
specific registry to pull from.

Discovering *new* organizations and what they've built (registries, natural
history studies, biobanks) is deliberately not this loader's job: that's
exactly what backend/app/discovery/ (Bright Data) already does, per its own
docs -- "patient organizations and the research infrastructure they own."
Two loaders both crawling for the same thing would be duplicated spend for
no benefit.

What this loader does instead, for the organizations already in
atlas_organizations: checks whether each stored url still resolves, so a
stale link surfaces before a demo does.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from ..config import Settings
from .store import LoaderStore

LOG = logging.getLogger(__name__)


@dataclass
class OrgsSummary:
    checked: int = 0
    broken: list[str] = field(default_factory=list)


async def run(settings: Settings, client: httpx.AsyncClient) -> OrgsSummary:
    store = LoaderStore(settings, client)
    summary = OrgsSummary()

    organizations = await store.get("atlas_organizations", {"select": "id,name,url"})
    for org in organizations:
        url = org.get("url")
        if not url:
            continue
        summary.checked += 1
        try:
            response = await client.head(url, follow_redirects=True, timeout=httpx.Timeout(10.0))
            if response.status_code >= 400:
                summary.broken.append(f"{org['name']}: {url} -> HTTP {response.status_code}")
        except httpx.HTTPError as error:
            summary.broken.append(f"{org['name']}: {url} -> {error}")

    return summary
