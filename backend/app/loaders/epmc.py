"""Europe PMC: real publications for our mechanism units, keyed by PMID.

REST API (https://www.ebi.ac.uk/europepmc/webservices/rest/search), no key
required. Fills atlas_publications, which was genuinely empty before this ran
-- same honest gap as atlas_grants.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import MECHANISM_UNITS

LOG = logging.getLogger(__name__)

SEARCH_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
RESULTS_PER_UNIT = 5


@dataclass
class EpmcSummary:
    publications_found: int = 0
    links_created: int = 0


async def run(settings: Settings, client: httpx.AsyncClient) -> EpmcSummary:
    store = LoaderStore(settings, client)
    summary = EpmcSummary()

    for unit in MECHANISM_UNITS:
        query = f'"{unit.gene}" AND "{unit.name}"'
        try:
            response = await client.get(
                SEARCH_URL,
                params={"query": query, "format": "json", "pageSize": str(RESULTS_PER_UNIT)},
                timeout=httpx.Timeout(20.0),
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            LOG.warning("Europe PMC lookup failed for %s: %s", unit.id, error)
            continue

        for result in response.json().get("resultList", {}).get("result", []):
            pmid = result.get("pmid")
            if not pmid:
                continue  # Preprints/books without a PMID are skipped; PMID is our key.

            await store.upsert(
                "atlas_publications",
                [
                    {
                        "id": pmid,
                        "pmid": pmid,
                        "title": result.get("title"),
                        "authors": result.get("authorString"),
                        "journal": result.get("journalTitle"),
                        "year": int(result["pubYear"]) if result.get("pubYear", "").isdigit() else None,
                        "url": f"https://europepmc.org/article/MED/{pmid}",
                    }
                ],
                on_conflict="id",
            )
            summary.publications_found += 1

            await store.upsert(
                "atlas_disease_publications",
                [{"disease_id": unit.id, "publication_id": pmid}],
                on_conflict="disease_id,publication_id",
            )
            summary.links_created += 1

    return summary
