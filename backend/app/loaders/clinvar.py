"""ClinVar: pathogenic variant counts and review status, per gene.

NCBI e-utilities (esearch + esummary), no key required for this volume of
traffic -- but unauthenticated requests are capped at 3/second, enforced here
with a fixed delay between calls rather than retry-on-429, since we make a
known, small, fixed number of requests per run. Counts and classifications
only -- this never writes effect_class.

IMPORTANT, per the plan: missense/nonsense is a statement about what a variant
does to the protein sequence; loss-of-function/gain-of-function is a statement
about what it does to the protein's activity. A nonsense variant is usually
loss-of-function, but a missense variant can be either (CACNA1A's own split is
the canonical example -- different missense variants in the same gene cause
opposite effect classes). This loader stores what ClinVar actually says
(clinical significance, review status, molecular consequence counts) and
leaves the effect-class judgment where it already lives: curated in
atlas_diseases, not inferred here.
"""

from __future__ import annotations

import asyncio
import logging
from collections import Counter
from dataclasses import dataclass

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import GENES

LOG = logging.getLogger(__name__)

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
_NCBI_MIN_INTERVAL = 0.35  # seconds; stays under NCBI's unauthenticated 3/sec cap


@dataclass
class ClinVarSummary:
    genes_resolved: int = 0
    total_pathogenic: int = 0
    total_likely_pathogenic: int = 0


async def _ncbi_get(client: httpx.AsyncClient, url: str, params: dict[str, str]) -> httpx.Response:
    await asyncio.sleep(_NCBI_MIN_INTERVAL)
    response = await client.get(url, params=params, timeout=httpx.Timeout(20.0))
    response.raise_for_status()
    return response


async def _count(client: httpx.AsyncClient, gene: str, significance: str) -> int:
    response = await _ncbi_get(
        client,
        ESEARCH_URL,
        {
            "db": "clinvar",
            "term": f"{gene}[gene] AND {significance}[clinical_significance]",
            "retmode": "json",
            "retmax": "0",
        },
    )
    return int(response.json().get("esearchresult", {}).get("count", 0))


async def _review_status_breakdown(client: httpx.AsyncClient, gene: str) -> dict[str, int]:
    """Samples the first 20 pathogenic/likely-pathogenic records for review status.

    Not exhaustive (ClinVar has no cheap group-by over e-utilities), but a
    representative sample is enough to characterize review-status mix for a
    demo, and is labeled as a sample rather than a full breakdown.
    """
    search = await _ncbi_get(
        client,
        ESEARCH_URL,
        {
            "db": "clinvar",
            "term": f'{gene}[gene] AND (pathogenic[clinical_significance] OR "likely pathogenic"[clinical_significance])',
            "retmode": "json",
            "retmax": "20",
        },
    )
    ids = search.json().get("esearchresult", {}).get("idlist", [])
    if not ids:
        return {}

    summary = await _ncbi_get(client, ESUMMARY_URL, {"db": "clinvar", "id": ",".join(ids), "retmode": "json"})
    result = summary.json().get("result", {})
    statuses = Counter()
    for uid in result.get("uids", []):
        status = result.get(uid, {}).get("germline_classification", {}).get("review_status")
        if status:
            statuses[status] += 1
    return dict(statuses)


async def run(settings: Settings, client: httpx.AsyncClient) -> ClinVarSummary:
    store = LoaderStore(settings, client)
    summary = ClinVarSummary()

    for gene in GENES:
        try:
            pathogenic = await _count(client, gene.symbol, "pathogenic")
            likely_pathogenic = await _count(client, gene.symbol, '"likely pathogenic"')
            review_sample = await _review_status_breakdown(client, gene.symbol)
        except httpx.HTTPError as error:
            LOG.warning("ClinVar lookup failed for %s: %s", gene.symbol, error)
            continue

        await store.patch_field(
            "atlas_genes",
            gene.symbol,
            {
                "clinvar_summary": {
                    "pathogenic_count": pathogenic,
                    "likely_pathogenic_count": likely_pathogenic,
                    "review_status_sample": review_sample,
                    "sample_note": "review_status_sample is from the first 20 matching records, not a full breakdown",
                }
            },
        )
        summary.genes_resolved += 1
        summary.total_pathogenic += pathogenic
        summary.total_likely_pathogenic += likely_pathogenic

    return summary
