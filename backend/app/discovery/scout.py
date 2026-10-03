"""Asset Scout: the discovery pipeline, end to end.

    seed term
      -> SERP queries            (Bright Data, billable)
      -> domain classifier       (free)
      -> fetch accepted pages    (Bright Data, billable)
      -> extract claims          (OpenAI, billable)
      -> quote verifier          (free, and it is the gate)
      -> score by rule           (free)
      -> Supabase

Runs offline, from the pipeline. A visitor's browser never triggers any of
this; the site reads what the run stored. That ordering is what keeps a demo
responsive and the bill small when twenty judges search the same gene.

`plan_only=True` prints the query set and the request estimate and spends
nothing, which is how you check a run's cost before paying for it.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from ..brightdata.client import BrightDataClient, BudgetExhausted, RequestBudget
from ..brightdata.serp import SerpClient, SerpHit
from ..brightdata.unlocker import UnlockerClient
from ..config import Settings
from ..llm.extract import ClaimExtractor, ExtractionError
from ..llm.score import score_claim
from ..llm.verify import Result, Tally, verify_quote
from .classify import classify
from .queries import discovery_plan, estimate_requests
from .store import DiscoveryStore, RunCounters

LOG = logging.getLogger(__name__)

# Asset kinds in the migration's asset_kind enum. A claim whose object_type is
# not one of these is kept as a claim but not promoted to an asset.
PROMOTABLE_KINDS = {
    "registry",
    "natural history study",
    "trial",
    "model",
    "biomarker",
    "biobank",
    "outcome measure",
    "dataset",
    "protocol",
}


@dataclass
class ScoutReport:
    seed_term: str
    run_id: str | None = None
    queries: list[str] = field(default_factory=list)
    estimated_requests: int = 0
    counters: RunCounters = field(default_factory=RunCounters)
    tally: Tally = field(default_factory=Tally)
    skipped_urls: list[tuple[str, str]] = field(default_factory=list)
    assets_promoted: int = 0
    stopped_early: str | None = None

    def summary(self) -> str:
        rate = self.tally.rejection_rate
        rate_text = "n/a" if rate is None else f"{rate:.0%}"
        return (
            f"{self.seed_term}: {self.counters.queries_run} queries, "
            f"{self.counters.urls_found} urls, {self.counters.pages_fetched} pages, "
            f"{self.counters.claims_extracted} claims "
            f"({self.counters.claims_verified} verified / "
            f"{self.counters.claims_rejected} rejected, rejection rate {rate_text}), "
            f"{self.assets_promoted} assets"
        )


class AssetScout:
    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient,
        *,
        budget: RequestBudget | None = None,
    ) -> None:
        self._settings = settings
        self._client = client
        self._budget = budget or RequestBudget(limit=settings.bright_data_max_requests)

    def plan(self, term: str, *, include_researchers: bool = False) -> ScoutReport:
        """Costs a run without spending anything."""
        queries = discovery_plan(term, include_researchers=include_researchers)
        return ScoutReport(
            seed_term=term,
            queries=queries,
            estimated_requests=estimate_requests(1, include_researchers=include_researchers),
        )

    async def run(
        self,
        term: str,
        *,
        disease_id: str | None = None,
        max_pages: int = 8,
        include_researchers: bool = False,
    ) -> ScoutReport:
        """Executes the full pipeline for one seed term."""
        report = self.plan(term, include_researchers=include_researchers)

        missing = self._missing_credentials()
        if missing:
            report.stopped_early = f"Missing credentials: {', '.join(missing)}"
            LOG.error(report.stopped_early)
            return report

        bright = BrightDataClient(self._settings, self._client, self._budget)
        serp = SerpClient(bright, self._settings.bright_data_serp_zone)
        unlocker = UnlockerClient(bright, self._settings.bright_data_unlocker_zone)
        extractor = ClaimExtractor(
            self._client,
            self._settings.openai_api_key or "",
            self._settings.openai_extract_model,
            self._settings.openai_prompt_version,
        )
        store = DiscoveryStore(self._settings, self._client)

        report.run_id = await store.start_run(term, disease_id=disease_id, dry_run=False)

        try:
            hits = await self._discover(serp, report)
            await self._persist_serp(store, report, hits)
            accepted = [h for h in hits if classify(h.url).accepted][:max_pages]
            await self._harvest(store, unlocker, extractor, report, accepted, disease_id)
        except BudgetExhausted as error:
            report.stopped_early = str(error)
            LOG.warning("stopping run early: %s", error)
        finally:
            await store.finish_run(report.run_id, report.counters, notes=report.stopped_early)

        LOG.info(report.summary())
        return report

    # ---------------------------------------------------------------- stages
    def _missing_credentials(self) -> list[str]:
        missing: list[str] = []
        if not self._settings.bright_data_configured:
            missing.append("BRIGHT_DATA_API_KEY")
        if not self._settings.openai_configured:
            missing.append("OPENAI_API_KEY")
        if not self._settings.database_configured:
            missing.append("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY")
        return missing

    async def _discover(self, serp: SerpClient, report: ScoutReport) -> list[SerpHit]:
        hits = await serp.search_many(report.queries)
        report.counters.queries_run = len(report.queries)
        report.counters.urls_found = len(hits)
        return hits

    async def _persist_serp(
        self, store: DiscoveryStore, report: ScoutReport, hits: list[SerpHit]
    ) -> None:
        rows = []
        for hit in hits:
            verdict = classify(hit.url)
            if not verdict.accepted:
                report.skipped_urls.append((hit.url, verdict.reason))
            rows.append(
                {
                    "query": hit.query,
                    "url": hit.url,
                    "domain": hit.domain,
                    "title": hit.title,
                    "snippet": hit.snippet,
                    "rank": hit.rank,
                    "kind": verdict.kind,
                    "accepted": verdict.accepted,
                    "reason": verdict.reason,
                }
            )
        await store.save_serp(report.run_id or "", rows)

    async def _harvest(
        self,
        store: DiscoveryStore,
        unlocker: UnlockerClient,
        extractor: ClaimExtractor,
        report: ScoutReport,
        hits: list[SerpHit],
        disease_id: str | None,
    ) -> None:
        for hit in hits:
            page = await unlocker.fetch(hit.url)
            if page is None:
                continue
            report.counters.pages_fetched += 1
            kind = classify(hit.url).kind

            source_id = await store.save_page(
                report.run_id or "",
                {
                    "url": page.url,
                    "domain": page.domain,
                    "title": hit.title,
                    "kind": kind,
                    "method": page.method,
                    "content": page.content,
                    "content_hash": page.content_hash,
                    "content_chars": page.content_chars,
                    "http_status": page.http_status,
                },
            )

            try:
                claims = await extractor.extract(page.url, page.content)
            except ExtractionError as error:
                LOG.warning("extraction failed for %s: %s", page.url, error)
                continue

            report.counters.claims_extracted += len(claims)
            rows, assets, results = self._judge(
                claims, page.content, kind, source_id, disease_id, extractor
            )
            for result in results:
                report.tally.record(result)
            report.counters.claims_verified += sum(1 for r in results if r.ok)
            report.counters.claims_rejected += sum(1 for r in results if not r.ok)

            saved = await store.save_claims(report.run_id or "", rows)
            await self._promote(store, saved, assets, source_id, disease_id, report)

    def _judge(
        self,
        claims: list,
        content: str,
        kind: str,
        source_id: str,
        disease_id: str | None,
        extractor: ClaimExtractor,
    ) -> tuple[list[dict], list[dict], list[Result]]:
        """Verifies, then scores. Rejected claims are kept with their reason.

        Returns the verifier results too, so the caller can tally them without
        paying to verify every quote a second time.
        """
        rows: list[dict] = []
        assets: list[dict] = []
        results: list[Result] = []
        for claim in claims:
            result = verify_quote(claim.quote, content)
            results.append(result)
            row: dict[str, object] = {
                "source_id": source_id,
                "subject_type": claim.subject_type,
                "subject_name": claim.subject_name,
                "predicate": claim.predicate,
                "object_type": claim.object_type,
                "object_name": claim.object_name,
                "disease_id": disease_id,
                "gene": claim.gene,
                "quote": claim.quote,
                "status": result.status,
                "model": extractor.method,
            }
            if result.ok:
                score = score_claim(
                    source_kind=kind,
                    object_name=claim.object_name,
                    quote=claim.quote,
                    participants=claim.participants,
                    eligibility=claim.eligibility,
                    investigator=claim.investigator,
                )
                row["confidence"] = score.confidence
                row["rule"] = score.rule
                if claim.object_type in PROMOTABLE_KINDS:
                    assets.append(
                        {
                            "kind": claim.object_type,
                            "name": claim.object_name,
                            "owner": claim.subject_name,
                            "eligibility": claim.eligibility,
                            "investigator": claim.investigator,
                            "participants": claim.participants,
                        }
                    )
            else:
                row["reject_reason"] = result.reason
            rows.append(row)
        return rows, assets, results

    async def _promote(
        self,
        store: DiscoveryStore,
        saved_claims: list[dict],
        assets: list[dict],
        source_id: str,
        disease_id: str | None,
        report: ScoutReport,
    ) -> None:
        """Links promoted assets back to the claim and page that prove them."""
        if not assets:
            return
        verified = [c for c in saved_claims if c.get("status") == "verified" and c.get("id")]
        rows = []
        for asset, claim in zip(assets, verified):
            rows.append(
                {
                    **asset,
                    "claim_id": claim["id"],
                    "source_id": source_id,
                    "disease_id": disease_id,
                    "reusable_because": (
                        f"Operated by {asset['owner']}; may transfer to units sharing "
                        "this mechanism, subject to expert review"
                    ),
                }
            )
        await store.save_assets(rows)
        report.assets_promoted += len(rows)
