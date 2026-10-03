"""Build the SERP queries for one gene or disease.

Each query costs a billable request, so the set is small, ordered by expected
yield, and quoted. Quoting the gene symbol matters: unquoted, `SNAP25` drifts
into unrelated product listings.

`asset_queries` is the Asset Scout set from the plan -- the searches that find
reusable research infrastructure rather than papers.
"""

from __future__ import annotations

# Ordered by how often they return an official organization first.
ORGANIZATION_SUFFIXES = (
    "foundation",
    "patient organization",
    "patient advocacy",
    "research foundation",
    "family alliance",
)

ASSET_SUFFIXES = (
    "patient registry",
    "natural history study",
    "biobank",
    "mouse model",
    "outcome measures",
)

RESEARCHER_SUFFIXES = (
    "principal investigator",
    "research lab",
)


def organization_queries(term: str) -> list[str]:
    """Find the community before looking for what it owns."""
    return [f'"{term}" {suffix}' for suffix in ORGANIZATION_SUFFIXES]


def asset_queries(term: str) -> list[str]:
    """The Asset Scout set: reusable research infrastructure."""
    return [f'"{term}" {suffix}' for suffix in ASSET_SUFFIXES]


def researcher_queries(term: str) -> list[str]:
    return [f'"{term}" {suffix}' for suffix in RESEARCHER_SUFFIXES]


def site_queries(domain: str, term: str | None = None) -> list[str]:
    """Narrow searches inside one known domain.

    Cheaper than a crawl when only a couple of pages are wanted, and useful
    when a site blocks crawling.
    """
    words = ("registry", "natural history", "research", "biobank", "grant")
    if term:
        return [f"site:{domain} {word} {term}" for word in words]
    return [f"site:{domain} {word}" for word in words]


def discovery_plan(term: str, *, include_researchers: bool = False) -> list[str]:
    """The full query set for one seed term, deduplicated and order-preserving."""
    queries = organization_queries(term) + asset_queries(term)
    if include_researchers:
        queries += researcher_queries(term)

    seen: set[str] = set()
    out: list[str] = []
    for query in queries:
        if query in seen:
            continue
        seen.add(query)
        out.append(query)
    return out


def estimate_requests(term_count: int, *, include_researchers: bool = False) -> int:
    """Billable SERP requests for a planned run, before any page fetches.

    Useful for answering "what will this cost?" without spending anything.
    """
    per_term = len(ORGANIZATION_SUFFIXES) + len(ASSET_SUFFIXES)
    if include_researchers:
        per_term += len(RESEARCHER_SUFFIXES)
    return term_count * per_term
