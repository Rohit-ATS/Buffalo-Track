"""End-to-end pipeline test with Bright Data and OpenAI mocked.

Exercises the real stages -- SERP parsing, the classifier, markdown fetching,
extraction parsing, the verifier, rule-based scoring -- against a fake
transport, so the whole chain is covered without spending a credit.

Set ATLAS_TEST_DB_URL to also write into a real Postgres (see
supabase/README.md for the local stack); without it the store is stubbed and
everything upstream still runs.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.parse import urlparse

import httpx
import pytest

from app.config import Settings
from app.discovery.classify import classify
from app.discovery.scout import AssetScout
from app.llm.extract import Claim
from app.llm.verify import verify_quote

FOUNDATION_PAGE = """
# STX1B Family Alliance

## Research programmes

The Alliance maintains the STX1B Patient Registry, which has enrolled 214
families across eleven countries since 2019.

We also fund the STX1B Natural History Study at a partner children's hospital,
led by Dr. A. Rivera, open to anyone with a confirmed STX1B variant.
"""

# One real quote, one paraphrase the verifier must reject.
MODEL_CLAIMS: dict[str, list[dict[str, Any]]] = {
    "claims": [
        {
            "subject_type": "organization",
            "subject_name": "STX1B Family Alliance",
            "predicate": "maintains",
            "object_type": "registry",
            "object_name": "STX1B Patient Registry",
            "quote": "maintains the STX1B Patient Registry, which has enrolled 214 families across eleven countries since 2019",
            "gene": "STX1B",
            "eligibility": None,
            "investigator": None,
            "participants": 214,
        },
        {
            "subject_type": "organization",
            "subject_name": "STX1B Family Alliance",
            "predicate": "funds",
            "object_type": "natural history study",
            "object_name": "STX1B Natural History Study",
            # Deliberately paraphrased: the page says "open to anyone with a
            # confirmed STX1B variant", not this.
            "quote": "The Alliance sponsors a natural history study that accepts all STX1B patients nationwide",
            "gene": "STX1B",
            "eligibility": "confirmed STX1B variant",
            "investigator": "Dr. A. Rivera",
            "participants": None,
        },
    ]
}

SERP_PAYLOAD = {
    "organic": [
        {"link": "https://stx1b-alliance.org/research", "title": "Research", "rank": 1},
        # Must be skipped: official API available.
        {"link": "https://clinicaltrials.gov/study/NCT00000000", "title": "A trial", "rank": 2},
        # Must be skipped: social.
        {"link": "https://www.facebook.com/groups/stx1b", "title": "Group", "rank": 3},
    ]
}


def _handler(request: httpx.Request) -> httpx.Response:
    url = str(request.url)

    if url.startswith("https://api.brightdata.com/request"):
        payload: dict[str, Any] = json.loads(request.content)
        target = str(payload.get("url", ""))
        if "google.com/search" in target:
            return httpx.Response(200, json=SERP_PAYLOAD)
        return httpx.Response(200, text=FOUNDATION_PAGE)

    raise AssertionError(f"unexpected request to {url}")


def test_the_classifier_still_refuses_what_can_never_be_evidence() -> None:
    """Social, wiki, API-backed and unsignalled domains are never fetched.

    This used to assert an allowlist of two domains, which made the SERP layer
    pointless: discovery could only re-fetch what someone had already approved.
    The gate that keeps bad claims out is the quote verifier, not the domain
    list, so a plausible non-profit is now fetched as a *candidate* and still
    has to produce a quote that appears in the page.
    """
    # Never evidence, whatever the path says.
    assert not classify("https://www.facebook.com/groups/stx1b").accepted
    assert not classify("https://en.wikipedia.org/wiki/STX1B").accepted
    # Has a real API: scraping it would be money burned.
    assert not classify("https://clinicaltrials.gov/study/NCT1").accepted
    assert not classify("https://pmc.ncbi.nlm.nih.gov/articles/PMC1/").accepted
    # A .com with no signal stays out.
    assert not classify("https://foundation.example.com/research").accepted
    assert not classify("https://dnalabsindia.com/test/stx1b").accepted

    # Reviewed domains are accepted outright...
    assert classify("https://stx1b-alliance.org/research").accepted
    # ...and a plausible non-profit or institution is accepted as a candidate.
    assert classify("https://rarediseases.org/registry").accepted
    assert classify("https://www.chop.edu/centers-programs/epilepsy").accepted


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-key",
        bright_data_api_key="test-bright-data",
        anthropic_api_key="test-anthropic",
    )


class StubStore:
    """Captures writes so the pipeline can be asserted without a database."""

    def __init__(self) -> None:
        self.serp: list[dict[str, Any]] = []
        self.pages: list[dict[str, Any]] = []
        self.claims: list[dict[str, Any]] = []
        self.assets: list[dict[str, Any]] = []
        self.finished = False

    async def start_run(self, seed_term, *, disease_id, dry_run):  # noqa: ANN001
        return "00000000-0000-4000-8000-000000000001"

    async def save_serp(self, run_id, hits):  # noqa: ANN001
        self.serp.extend(hits)

    async def save_page(self, run_id, page):  # noqa: ANN001
        self.pages.append(page)
        return f"page-{len(self.pages)}"

    async def save_claims(self, run_id, claims):  # noqa: ANN001
        stored = [{**c, "id": f"claim-{i}"} for i, c in enumerate(claims)]
        self.claims.extend(stored)
        return stored

    async def save_assets(self, assets):  # noqa: ANN001
        self.assets.extend(assets)

    async def finish_run(self, run_id, counters, *, notes=None):  # noqa: ANN001
        self.finished = True


class StubExtractor:
    """Returns the fixture claims without calling the model.

    Stubbed at the extractor boundary rather than over HTTP: the Anthropic SDK
    builds the request, and asserting on its wire format would test the SDK
    rather than this pipeline. The extractor's own contract is covered in
    test_extract.py.
    """

    method = "claude-haiku-4-5/extract-v1"

    async def extract(self, url: str, content: str) -> list[Claim]:
        return [Claim(**raw) for raw in MODEL_CLAIMS["claims"]]


@pytest.fixture
def stubbed_scout(monkeypatch, settings):  # noqa: ANN001
    store = StubStore()
    monkeypatch.setattr("app.discovery.scout.DiscoveryStore", lambda *a, **k: store)
    monkeypatch.setattr(
        "app.discovery.scout.ClaimExtractor", lambda *a, **k: StubExtractor()
    )
    client = httpx.AsyncClient(transport=httpx.MockTransport(_handler))
    return AssetScout(settings, client), store, client


def test_pipeline_keeps_only_the_verified_claim(stubbed_scout):  # noqa: ANN001
    scout, store, client = stubbed_scout

    async def go():
        try:
            return await scout.run("STX1B", disease_id="stx1b", max_pages=4)
        finally:
            await client.aclose()

    report = asyncio.run(go())

    # SERP returned three candidates; only the foundation is fetchable.
    assert report.counters.urls_found == 3
    assert report.counters.pages_fetched == 1
    assert len(store.pages) == 1
    assert store.pages[0]["kind"] == "patient organization"

    # Both claims are stored; only the verbatim one is verified.
    assert report.counters.claims_extracted == 2
    assert report.counters.claims_verified == 1
    assert report.counters.claims_rejected == 1
    assert report.tally.rejection_rate == 0.5

    verified = [c for c in store.claims if c["status"] == "verified"]
    rejected = [c for c in store.claims if c["status"] == "rejected"]
    assert len(verified) == 1 and len(rejected) == 1
    assert verified[0]["object_name"] == "STX1B Patient Registry"

    # The verified claim carries a score and the rule behind it, which the
    # schema's check constraint also requires.
    assert 0 < verified[0]["confidence"] <= 0.95
    assert "verified quote" in verified[0]["rule"]
    # The rejected one explains itself instead of vanishing.
    assert "does not appear" in rejected[0]["reject_reason"]
    assert "confidence" not in rejected[0]

    # Only the verified claim is promoted to an asset.
    assert len(store.assets) == 1
    assert store.assets[0]["kind"] == "registry"
    assert store.assets[0]["participants"] == 214
    assert store.finished


def test_skipped_urls_are_recorded_with_reasons(stubbed_scout):  # noqa: ANN001
    scout, store, client = stubbed_scout

    async def go():
        try:
            return await scout.run("STX1B", max_pages=4)
        finally:
            await client.aclose()

    report = asyncio.run(go())

    skipped = {url: reason for url, reason in report.skipped_urls}
    skipped_hosts = {urlparse(url).hostname for url in skipped}
    assert "clinicaltrials.gov" in skipped_hosts
    assert any("official API" in reason for reason in skipped.values())
    assert "www.facebook.com" in skipped_hosts

    # Every candidate is persisted with its verdict, accepted or not.
    assert len(store.serp) == 3
    assert sum(1 for row in store.serp if row["accepted"]) == 1


def test_run_refuses_without_credentials(settings):
    bare = settings.model_copy(update={"bright_data_api_key": None})
    client = httpx.AsyncClient(transport=httpx.MockTransport(_handler))

    async def go():
        try:
            return await AssetScout(bare, client).run("STX1B")
        finally:
            await client.aclose()

    report = asyncio.run(go())

    assert report.stopped_early is not None
    assert "BRIGHT_DATA_API_KEY" in report.stopped_early
    assert report.counters.pages_fetched == 0


def test_the_paraphrase_really_is_absent_from_the_page():
    """Guards the fixture itself: if the page ever contains the paraphrase,
    the rejection assertions above would pass for the wrong reason."""
    claims = [Claim(**raw) for raw in MODEL_CLAIMS["claims"]]
    assert verify_quote(claims[0].quote, FOUNDATION_PAGE).ok
    assert not verify_quote(claims[1].quote, FOUNDATION_PAGE).ok


def test_classifier_decisions_for_the_fixture_urls():
    assert classify("https://stx1b-alliance.org/research").accepted
    assert not classify("https://clinicaltrials.gov/study/NCT00000000").accepted
    assert not classify("https://www.facebook.com/groups/stx1b").accepted
