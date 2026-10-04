"""Decide what a candidate URL is, before paying to fetch it.

A SERP run returns foundations, hospital pages, trial records, Wikipedia,
Facebook groups and SEO filler in one list. Fetching all of it wastes credits
and feeds the extraction model junk.

This is a cheap, auditable allowlist: only a reviewed source domain can be
fetched. Every decision records a reason, which is what the discovery table
stores, so a judge can see why a URL was skipped.

Two rules worth stating:

* Official biomedical registries (clinicaltrials.gov, pubmed, ncbi) are
  classified and then REJECTED for fetching. They have proper APIs -- scraping
  them would waste credits on data we can get cleanly.
* Social and wiki domains are discovery signals only, never evidence.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

# Matches the web_source_kind enum in 20261003000006_web_discovery.sql.
Kind = str


@dataclass(frozen=True)
class Verdict:
    kind: Kind
    accepted: bool
    reason: str


# Hosts with real APIs: classify, then skip. Scraping these is money burned.
API_BACKED_HOSTS = {
    "clinicaltrials.gov": "trial record",
    "pubmed.ncbi.nlm.nih.gov": "publication",
    "ncbi.nlm.nih.gov": "publication",
    "europepmc.org": "publication",
    "reporter.nih.gov": "government",
    "hpo.jax.org": "reference",
    "monarchinitiative.org": "reference",
    "orpha.net": "reference",
    "omim.org": "reference",
}

# Never evidence. Some are useful for spotting an organization's real name.
EXCLUDED_HOSTS = {
    "facebook.com",
    "m.facebook.com",
    "x.com",
    "twitter.com",
    "instagram.com",
    "linkedin.com",
    "reddit.com",
    "youtube.com",
    "tiktok.com",
    "pinterest.com",
    "medium.com",
    "quora.com",
    "gofundme.com",
    "justgiving.com",
    "amazon.com",
    "google.com",
}

WIKI_HOSTS = {"wikipedia.org", "wikidata.org", "wikiwand.com"}

# Domains reviewed by the project. A hostname, suffix, or URL path is only a
# discovery signal; it is not evidence of who operates the source. Add a host
# here only after a human has verified its ownership and publication role.
TRUSTED_SOURCE_HOSTS = {"stx1b-alliance.org", "stxbp1disorders.org"}

# Second tier. A domain matching these is fetched as a *candidate*: its claims
# still have to survive the quote verifier before they become evidence, and
# their confidence starts lower. Without this tier the allowlist can only
# re-fetch domains someone already approved, which makes the SERP layer
# pointless -- discovery that cannot discover.
ORG_HOST_WORDS = (
    "foundation", "trust", "alliance", "association", "society", "charity",
    "advocacy", "families", "parents", "warriors", "cure", "patient", "syndrome",
    "disorder", "disease", "registry",
)

INSTITUTION_HOST_WORDS = (
    "hospital", "childrens", "children", "clinic", "medicine", "medical",
    "health", "institute", "univ", "college", "school", "research",
)

LAB_PATH_WORDS = ("/lab", "/labs/", "/faculty", "/people/", "/profile", "/researcher")

REGISTRY_PATH_WORDS = ("registry", "natural-history", "naturalhistory", "biobank", "study")


def _host(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _registrable(host: str) -> str:
    """Last two labels, enough to match a known host set."""
    parts = host.split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else host


def classify(url: str) -> Verdict:
    """Classifies a candidate URL and says whether it is worth fetching."""
    if not url.startswith(("http://", "https://")):
        return Verdict("unknown", False, "Not an http(s) URL")

    host = _host(url)
    if not host:
        return Verdict("unknown", False, "No hostname")

    base = _registrable(host)
    path = (urlparse(url).path or "/").lower()

    if base in EXCLUDED_HOSTS or host in EXCLUDED_HOSTS:
        return Verdict("social", False, f"{base} is a social or commercial platform")

    if base in WIKI_HOSTS:
        return Verdict("reference", False, "Wiki page: discovery signal only, not evidence")

    # Match subdomains too: pmc.ncbi.nlm.nih.gov is PubMed Central, which has
    # an API, and would otherwise fall through to the .gov branch and be
    # scraped at full price.
    api_kind = API_BACKED_HOSTS.get(host) or API_BACKED_HOSTS.get(base)
    if not api_kind:
        api_kind = next(
            (kind for known, kind in API_BACKED_HOSTS.items() if host.endswith("." + known)),
            None,
        )
    if api_kind:
        return Verdict(
            api_kind, False, f"{base} has an official API; fetch it there, not via scraping"
        )

    if host in TRUSTED_SOURCE_HOSTS or base in TRUSTED_SOURCE_HOSTS:
        return Verdict("patient organization", True, "Reviewed organization domain")

    path = (urlparse(url).path or "/").lower()
    nonprofit = host.endswith((".org", ".ngo", ".charity"))
    institutional = host.endswith((".edu", ".ac.uk")) or ".edu." in host

    if nonprofit and any(word in host for word in ORG_HOST_WORDS):
        return Verdict("patient organization", True, "Non-profit host names a disease community")

    if host.endswith(".gov"):
        return Verdict("government", True, "Government domain")

    if institutional or (nonprofit and any(w in host for w in INSTITUTION_HOST_WORDS)):
        if any(word in path for word in LAB_PATH_WORDS):
            return Verdict("lab", True, "Institution domain with a lab or profile path")
        return Verdict("research institution", True, "Research institution domain")

    if nonprofit and any(word in path for word in REGISTRY_PATH_WORDS):
        return Verdict("registry", True, "Non-profit path names a registry or study")

    if nonprofit:
        return Verdict("patient organization", True, "Non-profit domain")

    return Verdict("unknown", False, "No signal that this is an official source")


def accepted(urls: list[str]) -> list[str]:
    """Convenience filter used by the orchestrator."""
    return [url for url in urls if classify(url).accepted]
