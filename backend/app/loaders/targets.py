"""The curated genes and mechanism units every loader resolves against.

Single source of truth so `monarch.py`, `hpo.py`, `ctgov.py`, and the rest
can't drift onto different entity lists. Mirrors the 9 genes / 9 mechanism
units seeded from frontend/src/lib/atlas-data.ts (see supabase/seed_atlas.sql)
-- this module doesn't read that file (it's TypeScript), so if the curated
set changes there, update this list too.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Gene:
    symbol: str  # matches atlas_genes.id


@dataclass(frozen=True)
class MechanismUnit:
    id: str  # matches atlas_diseases.id / atlas_disease_entities.id
    name: str  # the clinical disease name, for resolving against external search APIs
    gene: str


GENES: tuple[Gene, ...] = (
    Gene("STXBP1"),
    Gene("STX1B"),
    Gene("SNAP25"),
    Gene("SYT1"),
    Gene("SCN2A"),
    Gene("KCNQ2"),
    Gene("CACNA1A"),
    Gene("VAMP2"),
)

MECHANISM_UNITS: tuple[MechanismUnit, ...] = (
    MechanismUnit("stxbp1", "STXBP1 encephalopathy", "STXBP1"),
    MechanismUnit("stx1b", "STX1B-related epilepsy", "STX1B"),
    MechanismUnit("snap25", "SNAP25 encephalopathy", "SNAP25"),
    MechanismUnit("syt1", "SYT1-associated neurodevelopmental disorder", "SYT1"),
    MechanismUnit("scn2a", "SCN2A-related disorder", "SCN2A"),
    MechanismUnit("kcnq2", "KCNQ2 encephalopathy", "KCNQ2"),
    MechanismUnit("cacna1a-ea2", "Episodic ataxia type 2", "CACNA1A"),
    MechanismUnit("cacna1a-fhm1", "Familial hemiplegic migraine type 1", "CACNA1A"),
    MechanismUnit("vamp2", "VAMP2-related neurodevelopmental disorder", "VAMP2"),
)

PATHWAY_NAMES: tuple[str, ...] = (
    "Presynaptic vesicle release",
    "Neuronal excitability",
    "Calcium signaling",
)
