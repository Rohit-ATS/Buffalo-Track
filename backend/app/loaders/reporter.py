"""NIH RePORTER: real grants for our genes, keyed by project number.

API v2 (https://api.reporter.nih.gov/v2/projects/search), POST, no key
required. Fills atlas_grants, which was genuinely empty before this ran --
the curated demo dataset has no per-grant records, only database-level
sources (see supabase/README.md's "Honest gaps").
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from ..config import Settings
from .store import LoaderStore
from .targets import GENES, MECHANISM_UNITS

LOG = logging.getLogger(__name__)

SEARCH_URL = "https://api.reporter.nih.gov/v2/projects/search"


@dataclass
class ReporterSummary:
    grants_found: int = 0
    links_created: int = 0


async def run(settings: Settings, client: httpx.AsyncClient) -> ReporterSummary:
    store = LoaderStore(settings, client)
    summary = ReporterSummary()

    units_by_gene: dict[str, list[str]] = {}
    for unit in MECHANISM_UNITS:
        units_by_gene.setdefault(unit.gene, []).append(unit.id)

    for gene in GENES:
        try:
            response = await client.post(
                SEARCH_URL,
                json={
                    "criteria": {
                        "advanced_text_search": {
                            "operator": "and",
                            "search_field": "projecttitle,terms",
                            "search_text": gene.symbol,
                        }
                    },
                    "include_fields": [
                        "ProjectNum",
                        "ProjectTitle",
                        "OrgName",
                        "ContactPiName",
                        "AwardAmount",
                        "ProjectStartDate",
                        "ProjectEndDate",
                        "AgencyIcAdmin",
                    ],
                    "offset": 0,
                    "limit": 10,
                },
                timeout=httpx.Timeout(20.0),
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            LOG.warning("NIH RePORTER lookup failed for %s: %s", gene.symbol, error)
            continue

        for grant in response.json().get("results", []):
            project_num = grant.get("project_num")
            if not project_num:
                continue

            await store.upsert(
                "atlas_grants",
                [
                    {
                        "id": project_num,
                        "reporter_id": project_num,
                        "title": grant.get("project_title"),
                        "agency": (grant.get("agency_ic_admin") or {}).get("name"),
                        "pi_name": grant.get("contact_pi_name"),
                        "amount": grant.get("award_amount"),
                        "start_date": (grant.get("project_start_date") or "")[:10] or None,
                        "end_date": (grant.get("project_end_date") or "")[:10] or None,
                        "url": f"https://reporter.nih.gov/project-details/{grant.get('appl_id', '')}"
                        if grant.get("appl_id")
                        else None,
                    }
                ],
                on_conflict="id",
            )
            summary.grants_found += 1

            links = [
                {"disease_id": disease_id, "grant_id": project_num}
                for disease_id in units_by_gene.get(gene.symbol, [])
            ]
            if links:
                await store.upsert("atlas_disease_grants", links, on_conflict="disease_id,grant_id")
                summary.links_created += len(links)

    return summary
