"""Command line for the discovery pipeline.

    # What would this cost? Spends nothing.
    python -m app.discovery.cli plan STXBP1 STX1B SNAP25

    # Run it.
    python -m app.discovery.cli run STXBP1 --disease-id stxbp1 --max-pages 6

    # Re-verify stored pages after changing the verifier. No fetching, no spend.
    python -m app.discovery.cli reverify

`plan` is the default-safe verb: it is easy to run `run` across twenty genes by
accident, so the cost of a run is one command away from being known.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

import httpx

from ..config import get_settings
from .queries import estimate_requests
from .scout import AssetScout


def _configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(levelname)-8s %(name)s: %(message)s",
    )


async def _plan(terms: list[str], include_researchers: bool) -> int:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        scout = AssetScout(settings, client)
        total = 0
        for term in terms:
            report = scout.plan(term, include_researchers=include_researchers)
            print(f"\n{term}: {len(report.queries)} queries")
            for query in report.queries:
                print(f"  {query}")
            total += report.estimated_requests

    print(f"\n--- estimate for {len(terms)} term(s) ---")
    print(f"SERP requests:        {total}")
    print(f"Page fetches (max 8): up to {len(terms) * 8}")
    print(f"Billable total:       up to {total + len(terms) * 8} Bright Data requests")
    print(f"Per-run cap:          {get_settings().bright_data_max_requests}")

    missing = _missing(settings)
    if missing:
        print(f"\nNot runnable yet. Missing: {', '.join(missing)}")
    return 0


def _missing(settings) -> list[str]:
    missing: list[str] = []
    if not settings.bright_data_configured:
        missing.append("BRIGHT_DATA_API_KEY")
    if not settings.openai_configured:
        missing.append("OPENAI_API_KEY")
    if not settings.database_configured:
        missing.append("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY")
    return missing


async def _run(terms: list[str], disease_id: str | None, max_pages: int, researchers: bool) -> int:
    settings = get_settings()
    missing = _missing(settings)
    if missing:
        print(f"Cannot run. Missing: {', '.join(missing)}", file=sys.stderr)
        print("See backend/.env.example.", file=sys.stderr)
        return 2

    if disease_id and len(terms) > 1:
        print("--disease-id applies to a single term; run terms separately.", file=sys.stderr)
        return 2

    async with httpx.AsyncClient() as client:
        scout = AssetScout(settings, client)
        for term in terms:
            report = await scout.run(
                term,
                disease_id=disease_id,
                max_pages=max_pages,
                include_researchers=researchers,
            )
            print(report.summary())
            if report.skipped_urls:
                print(f"  skipped {len(report.skipped_urls)} urls:")
                for url, reason in report.skipped_urls[:10]:
                    print(f"    {url}\n      {reason}")
            if report.stopped_early:
                print(f"  stopped early: {report.stopped_early}")
                return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="discovery", description=__doc__)
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan", help="print the query set and cost estimate; spends nothing")
    plan.add_argument("terms", nargs="+")
    plan.add_argument("--researchers", action="store_true")

    run = sub.add_parser("run", help="execute the pipeline (spends credits)")
    run.add_argument("terms", nargs="+")
    run.add_argument("--disease-id", default=None, help="link results to an atlas_diseases id")
    run.add_argument("--max-pages", type=int, default=8)
    run.add_argument("--researchers", action="store_true")

    args = parser.parse_args(argv)
    _configure_logging(args.verbose)

    if args.command == "plan":
        return asyncio.run(_plan(args.terms, args.researchers))
    return asyncio.run(_run(args.terms, args.disease_id, args.max_pages, args.researchers))


if __name__ == "__main__":
    raise SystemExit(main())
