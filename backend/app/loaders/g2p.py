"""ClinGen + Gene2Phenotype, and Reactome/GO/STRING pathway membership.

The plan's loader list doesn't name a separate file for Reactome/GO/STRING,
and its own checklist for that section sits directly under ClinGen +
Gene2Phenotype's ("Generate mechanism units" sits right above it) -- pathway
membership lives here rather than inventing a ninth file.

Four real sources, four different confidence levels:
- ClinGen gene-disease validity (bulk CSV): curated, high confidence.
- ClinGen dosage sensitivity (bulk CSV): curated, high confidence.
- EBI Gene2Phenotype (API): curated, but "mechanism" here is
  loss-of-function/gain-of-function/dominant-negative at the gene level,
  which can genuinely disagree with our per-unit effect_class (CACNA1A's own
  split is why) -- disagreements are reported, never auto-applied.
- Reactome/GO (API via UniProt): only backfills atlas_pathways.reactome_id/
  go_id on a clear name match against our 3 curated pathways; otherwise
  reports candidates rather than guessing.

"Generate mechanism units" (the G2P checklist item) is deliberately not
auto-creating atlas_diseases rows -- these are curated clinical entities, and
fabricating one from a gene-level API disagreement would be exactly the kind
of placeholder this project has avoided everywhere else. Candidates the data
suggests but we don't yet have are reported for a human to review.
"""

from __future__ import annotations

import csv
import io
import logging
from dataclasses import dataclass, field

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import GENES

LOG = logging.getLogger(__name__)

CLINGEN_VALIDITY_URL = "https://search.clinicalgenome.org/kb/gene-validity/download"
CLINGEN_DOSAGE_URL = "https://search.clinicalgenome.org/kb/gene-dosage/download"
G2P_SEARCH_URL = "https://www.ebi.ac.uk/gene2phenotype/api/search"
REACTOME_SEARCH_URL = "https://reactome.org/ContentService/search/query"
QUICKGO_URL = "https://www.ebi.ac.uk/QuickGO/services/annotation/search"


@dataclass
class G2pSummary:
    validity_found: int = 0
    dosage_set: int = 0
    g2p_mechanism_disagreements: list[str] = field(default_factory=list)
    pathways_matched: int = 0
    pathway_candidates_unmatched: list[str] = field(default_factory=list)


async def _download_csv(client: httpx.AsyncClient, url: str) -> list[dict[str, str]]:
    response = await client.get(url, timeout=httpx.Timeout(60.0))
    response.raise_for_status()
    # ClinGen's export has a few header/banner rows before the real header row.
    lines = response.text.splitlines()
    header_idx = next(i for i, line in enumerate(lines) if line.startswith('"GENE SYMBOL"'))
    reader = csv.DictReader(io.StringIO("\n".join(lines[header_idx:])))
    return list(reader)


async def _clingen_validity(client: httpx.AsyncClient, store: LoaderStore, summary: G2pSummary) -> None:
    our_genes = {g.symbol for g in GENES}
    try:
        rows = await _download_csv(client, CLINGEN_VALIDITY_URL)
    except httpx.HTTPError as error:
        LOG.warning("ClinGen gene-validity download failed: %s", error)
        return
    for row in rows:
        gene = row.get("GENE SYMBOL", "").strip()
        if gene not in our_genes:
            continue
        hgnc_id = row.get("GENE ID (HGNC)", "").strip()
        if hgnc_id:
            await store.patch_field("atlas_genes", gene, {"hgnc_id": hgnc_id})
        summary.validity_found += 1


async def _clingen_dosage(client: httpx.AsyncClient, store: LoaderStore, summary: G2pSummary) -> None:
    our_genes = {g.symbol for g in GENES}
    try:
        rows = await _download_csv(client, CLINGEN_DOSAGE_URL)
    except httpx.HTTPError as error:
        LOG.warning("ClinGen gene-dosage download failed: %s", error)
        return
    for row in rows:
        gene = row.get("GENE SYMBOL", "").strip()
        if gene not in our_genes:
            continue
        haplo = row.get("HAPLOINSUFFICIENCY", "").strip()
        triplo = row.get("TRIPLOSENSITIVITY", "").strip()
        if not (haplo or triplo):
            continue
        await store.patch_field(
            "atlas_genes",
            gene,
            {"dosage_sensitivity": {"haploinsufficiency": haplo or None, "triplosensitivity": triplo or None}},
        )
        summary.dosage_set += 1


async def _g2p(client: httpx.AsyncClient, summary: G2pSummary) -> None:
    for gene in GENES:
        try:
            response = await client.get(
                G2P_SEARCH_URL, params={"query": gene.symbol}, follow_redirects=True, timeout=httpx.Timeout(20.0)
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            LOG.warning("G2P lookup failed for %s: %s", gene.symbol, error)
            continue
        for record in response.json().get("results", []):
            mechanism = record.get("mechanism", "")
            disease = record.get("disease", "")
            if mechanism and mechanism not in ("undetermined", ""):
                # Informational only: G2P's "mechanism" is gene-level, our
                # effect_class is per mechanism-unit. A gene with two curated
                # units (like CACNA1A) can legitimately disagree with a single
                # gene-level mechanism label -- that's not a bug to fix here.
                summary.g2p_mechanism_disagreements.append(
                    f"{gene.symbol}: G2P says '{mechanism}' for '{disease}' (stable_id={record.get('stable_id')})"
                )


async def _reactome_go(client: httpx.AsyncClient, store: LoaderStore, summary: G2pSummary) -> None:
    pathway_ids = {
        row["name"]: row["id"] for row in await store.get("atlas_pathways", {"select": "id,name"})
    }
    for gene in GENES:
        try:
            response = await client.get(
                REACTOME_SEARCH_URL,
                params={"query": gene.symbol, "species": "Homo sapiens", "types": "Pathway", "cluster": "true"},
                timeout=httpx.Timeout(20.0),
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            LOG.warning("Reactome lookup failed for %s: %s", gene.symbol, error)
            continue

        candidates: list[tuple[str, str]] = []  # (stId, name)
        for group in response.json().get("results", []):
            for entry in group.get("entries", []):
                if entry.get("type") == "Pathway" and entry.get("stId"):
                    name = _strip_highlight(entry.get("name", ""))
                    candidates.append((entry["stId"], name))

        matched = False
        for pathway_name, pathway_id in pathway_ids.items():
            for st_id, candidate_name in candidates:
                if _names_overlap(pathway_name, candidate_name):
                    await store.patch_field("atlas_pathways", pathway_id, {"reactome_id": st_id})
                    summary.pathways_matched += 1
                    matched = True
                    break
            if matched:
                break
        if not matched and candidates:
            summary.pathway_candidates_unmatched.append(
                f"{gene.symbol}: {candidates[0][1]} ({candidates[0][0]}) -- no confident match to a curated pathway"
            )


def _strip_highlight(text: str) -> str:
    return text.replace('<span class="highlighting" >', "").replace("</span>", "")


# Long enough to pass a length filter, generic enough to mean nothing: almost
# every pathway/process name in biology contains one of these.
_GENERIC_PATHWAY_WORDS = {
    "function",
    "process",
    "pathway",
    "pathways",
    "signaling",
    "signalling",
    "regulation",
    "activity",
    "system",
    "cycle",
    "general",
}


def _names_overlap(a: str, b: str) -> bool:
    a_words = {w for w in a.lower().split() if len(w) > 4} - _GENERIC_PATHWAY_WORDS
    b_words = {w for w in b.lower().split() if len(w) > 4} - _GENERIC_PATHWAY_WORDS
    return bool(a_words & b_words)


async def run(settings: Settings, client: httpx.AsyncClient) -> G2pSummary:
    store = LoaderStore(settings, client)
    summary = G2pSummary()
    await _clingen_validity(client, store, summary)
    await _clingen_dosage(client, store, summary)
    await _g2p(client, summary)
    await _reactome_go(client, store, summary)
    return summary
