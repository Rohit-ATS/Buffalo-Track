"""HPO: phenotype associations, frequencies, and information content.

Bulk files, not an API -- genes_to_phenotype.txt is keyed by gene symbol
directly, which avoids needing an OMIM/MONDO crosswalk to use it. Downloaded
once per run (~21MB) and cached locally; nothing here hits phenotype.hpoa,
since every phenotype this project curates is already reachable by gene.

Information content is computed from the full file (not just our genes), so
it's a genuine corpus-wide specificity statistic, matching the existing
comment in the schema: "seizure" should score low (nearly every gene has it),
a rare, specific term should score high. IC = -log2(genes with this term /
total genes in the file).
"""

from __future__ import annotations

import logging
import math
import tempfile
from collections import defaultdict
from pathlib import Path

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import GENES, MECHANISM_UNITS

LOG = logging.getLogger(__name__)

SOURCE_URL = "http://purl.obolibrary.org/obo/hp/hpoa/genes_to_phenotype.txt"
CACHE_PATH = Path(tempfile.gettempdir()) / "buffalo_track_genes_to_phenotype.txt"

# The HPO frequency sub-ontology, for rows that give a term instead of a
# fraction. https://hpo.jax.org/app/browse/term/HP:0040279
_FREQUENCY_TERMS = {
    "HP:0040280": 1.0,  # Obligate
    "HP:0040281": 0.90,  # Very frequent (80-99%)
    "HP:0040282": 0.55,  # Frequent (30-79%)
    "HP:0040283": 0.17,  # Occasional (5-29%)
    "HP:0040284": 0.025,  # Very rare (1-4%)
    "HP:0040285": 0.0,  # Excluded
}


def _parse_frequency(raw: str) -> float | None:
    if not raw or raw == "-":
        return None
    if raw in _FREQUENCY_TERMS:
        return _FREQUENCY_TERMS[raw]
    if "/" in raw:
        num, _, den = raw.partition("/")
        try:
            n, d = float(num), float(den)
            return n / d if d else None
        except ValueError:
            return None
    return None


async def _download(client: httpx.AsyncClient) -> Path:
    if CACHE_PATH.exists() and CACHE_PATH.stat().st_size > 0:
        LOG.info("using cached %s (%d bytes)", CACHE_PATH, CACHE_PATH.stat().st_size)
        return CACHE_PATH
    LOG.info("downloading %s", SOURCE_URL)
    async with client.stream("GET", SOURCE_URL, follow_redirects=True, timeout=httpx.Timeout(120.0)) as response:
        response.raise_for_status()
        with open(CACHE_PATH, "wb") as f:
            async for chunk in response.aiter_bytes():
                f.write(chunk)
    return CACHE_PATH


def _compute_information_content(path: Path) -> dict[str, float]:
    gene_sets: dict[str, set[str]] = defaultdict(set)
    all_genes: set[str] = set()
    with open(path, encoding="utf-8") as f:
        next(f)  # header
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 4:
                continue
            gene_symbol, hpo_id = cols[1], cols[2]
            gene_sets[hpo_id].add(gene_symbol)
            all_genes.add(gene_symbol)
    total = len(all_genes) or 1
    return {term: -math.log2(len(genes) / total) for term, genes in gene_sets.items() if genes}


class HpoSummary:
    def __init__(self) -> None:
        self.phenotypes_matched = 0
        self.frequencies_set = 0
        self.information_content_set = 0


async def run(settings: Settings, client: httpx.AsyncClient) -> HpoSummary:
    store = LoaderStore(settings, client)
    summary = HpoSummary()

    path = await _download(client)
    information_content = _compute_information_content(path)

    our_genes = {g.symbol for g in GENES}
    existing_phenotypes = {
        row["name"].lower(): row["id"] for row in await store.get("atlas_phenotypes", {"select": "id,name"})
    }
    name_to_disease_ids: dict[str, list[str]] = defaultdict(list)
    for unit in MECHANISM_UNITS:
        name_to_disease_ids[unit.gene].append(unit.id)

    with open(path, encoding="utf-8") as f:
        next(f)
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 6:
                continue
            _, gene_symbol, hpo_id, hpo_name, frequency_raw, _disease_id = cols
            if gene_symbol not in our_genes:
                continue
            phenotype_id = existing_phenotypes.get(hpo_name.lower())
            if not phenotype_id:
                continue  # Only enriching phenotypes already curated, not importing new ones.

            ic = information_content.get(hpo_id)
            frequency = _parse_frequency(frequency_raw)
            await store.patch_field("atlas_phenotypes", phenotype_id, {"hpo_id": hpo_id})
            summary.phenotypes_matched += 1
            if ic is not None:
                summary.information_content_set += 1

            for disease_id in name_to_disease_ids.get(gene_symbol, []):
                values: dict[str, float] = {}
                if ic is not None:
                    values["info_content"] = round(ic, 3)
                if frequency is not None:
                    values["frequency"] = round(frequency, 3)
                    summary.frequencies_set += 1
                if values:
                    await store.upsert(
                        "atlas_symptoms",
                        [{"disease_id": disease_id, "symptom": hpo_name.lower(), **values}],
                        on_conflict="disease_id,symptom",
                    )

    return summary
