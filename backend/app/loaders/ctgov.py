"""ClinicalTrials.gov: real trials for our genes, keyed by NCT number.

API v2 (https://clinicaltrials.gov/api/v2/studies), no key required. Writes
real atlas_trials rows -- additive, upserted by nct_id as the row id, so it
never touches the hand-curated demo trials already seeded under synthetic
ids.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import GENES, MECHANISM_UNITS

LOG = logging.getLogger(__name__)

SEARCH_URL = "https://clinicaltrials.gov/api/v2/studies"
FIELDS = (
    "NCTId,BriefTitle,OverallStatus,StudyType,LeadSponsorName,"
    "OverallOfficialName,EligibilityCriteria,StudyFirstSubmitDate"
)


@dataclass
class CtgovSummary:
    trials_found: int = 0
    links_created: int = 0


def _get(path: list[str], obj: dict) -> str | None:
    for key in path:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(key)
    return obj if isinstance(obj, str) else None


async def run(settings: Settings, client: httpx.AsyncClient) -> CtgovSummary:
    store = LoaderStore(settings, client)
    summary = CtgovSummary()

    units_by_gene: dict[str, list[str]] = {}
    for unit in MECHANISM_UNITS:
        units_by_gene.setdefault(unit.gene, []).append(unit.id)

    for gene in GENES:
        try:
            response = await client.get(
                SEARCH_URL,
                params={"query.term": gene.symbol, "pageSize": "10", "fields": FIELDS},
                timeout=httpx.Timeout(20.0),
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            LOG.warning("ClinicalTrials.gov lookup failed for %s: %s", gene.symbol, error)
            continue

        for study in response.json().get("studies", []):
            proto = study.get("protocolSection", {})
            nct_id = _get(["identificationModule", "nctId"], proto)
            if not nct_id:
                continue

            eligibility = _get(["eligibilityModule", "eligibilityCriteria"], proto)
            officials = proto.get("contactsLocationsModule", {}).get("overallOfficials", [])

            await store.upsert(
                "atlas_trials",
                [
                    {
                        "id": nct_id,
                        "nct_id": nct_id,
                        "name": _get(["identificationModule", "briefTitle"], proto) or nct_id,
                        "status": _get(["statusModule", "overallStatus"], proto),
                        "study_type": _get(["designModule", "studyType"], proto),
                        "sponsor": _get(["sponsorCollaboratorsModule", "leadSponsor", "name"], proto),
                        "investigator": officials[0].get("name") if officials else None,
                        "eligibility": (eligibility or "")[:2000] or None,
                        "start_date": _get(["statusModule", "studyFirstSubmitDate"], proto),
                        "url": f"https://clinicaltrials.gov/study/{nct_id}",
                        "retrieved_at": "now()",
                    }
                ],
                on_conflict="id",
            )
            summary.trials_found += 1

            links = [
                {"trial_id": nct_id, "disease_id": disease_id} for disease_id in units_by_gene.get(gene.symbol, [])
            ]
            if links:
                await store.upsert("atlas_trial_diseases", links, on_conflict="trial_id,disease_id")
                summary.links_created += len(links)

    return summary
