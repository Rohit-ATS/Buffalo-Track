"""Monarch Initiative: gene/disease resolution against MONDO.

Monarch's search API is built directly on MONDO, so this module covers both
the "Monarch" and "MONDO" sections of the plan's loader list: HGNC ids for
genes, canonical MONDO ids and synonyms for diseases, and the KG release
version. "Convert disease IDs to MONDO" / "Make MONDO canonical" / "Never key
diseases using text names" happens by writing the resolved MONDO id onto
atlas_disease_entities.mondo_id -- id/name there stay as the pre-existing
local key (see 20261003000008_disease_entities.sql), but mondo_id is the
canonical cross-reference once this has run.

API: https://api.monarchinitiative.org/v3/api/search (no key required).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import GENES, MECHANISM_UNITS

LOG = logging.getLogger(__name__)

SEARCH_URL = "https://api.monarchinitiative.org/v3/api/search"
RELEASE_URL = "https://data.monarchinitiative.org/monarch-kg-dev/latest/metadata.yaml"


@dataclass
class MonarchSummary:
    genes_resolved: int = 0
    diseases_resolved: int = 0
    synonyms_imported: int = 0
    unresolved: list[str] = field(default_factory=list)


async def _search(client: httpx.AsyncClient, query: str, category: str) -> dict | None:
    response = await client.get(
        SEARCH_URL,
        params={"q": query, "category": category, "limit": "5"},
        timeout=httpx.Timeout(20.0),
    )
    response.raise_for_status()
    items = response.json().get("items", [])
    # Prefer an exact, non-deprecated human match over a fuzzy hit.
    for item in items:
        if item.get("name", "").lower() == query.lower() and not item.get("deprecated"):
            return item
    return items[0] if items else None


async def _release_version(client: httpx.AsyncClient) -> str | None:
    try:
        response = await client.get(RELEASE_URL, timeout=httpx.Timeout(10.0))
        response.raise_for_status()
        for line in response.text.splitlines():
            if line.startswith("version:"):
                return line.split(":", 1)[1].strip().strip("'\"")
    except httpx.HTTPError as error:
        LOG.warning("could not read Monarch release metadata: %s", error)
    return None


async def run(settings: Settings, client: httpx.AsyncClient) -> MonarchSummary:
    store = LoaderStore(settings, client)
    summary = MonarchSummary()

    version = await _release_version(client)
    if version:
        await store.upsert(
            "atlas_sources",
            [
                {
                    "id": "monarch",
                    "name": "Monarch Initiative",
                    "url": "https://monarchinitiative.org/",
                    "pulled_at": "now()",
                    "dataset_version": version,
                }
            ],
            on_conflict="id",
        )

    for gene in GENES:
        try:
            hit = await _search(client, gene.symbol, "biolink:Gene")
        except httpx.HTTPError as error:
            LOG.warning("Monarch gene search failed for %s: %s", gene.symbol, error)
            summary.unresolved.append(gene.symbol)
            continue
        if not hit or not hit.get("id", "").startswith("HGNC:"):
            summary.unresolved.append(gene.symbol)
            continue
        await store.patch_field("atlas_genes", gene.symbol, {"hgnc_id": hit["id"]})
        summary.genes_resolved += 1

    for unit in MECHANISM_UNITS:
        try:
            hit = await _search(client, unit.name, "biolink:Disease")
        except httpx.HTTPError as error:
            LOG.warning("Monarch disease search failed for %s: %s", unit.name, error)
            summary.unresolved.append(unit.name)
            continue
        if not hit or not hit.get("id", "").startswith("MONDO:"):
            summary.unresolved.append(unit.name)
            continue
        await store.patch_field("atlas_disease_entities", unit.id, {"mondo_id": hit["id"]})
        summary.diseases_resolved += 1

        synonyms = [s for s in (hit.get("exact_synonym") or hit.get("synonym") or []) if s]
        if synonyms:
            await store.upsert(
                "atlas_synonyms",
                [{"disease_id": unit.id, "synonym": s} for s in synonyms[:10]],
                on_conflict="disease_id,synonym",
            )
            summary.synonyms_imported += len(synonyms[:10])

    return summary
