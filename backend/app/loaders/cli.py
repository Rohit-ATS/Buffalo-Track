"""Command line for the external-data loaders.

    # Run one loader.
    python -m app.loaders.cli run monarch

    # Run all eight, in the order each depends on the last (monarch resolves
    # MONDO ids that g2p's Reactome/GO pass doesn't need, but running monarch
    # first means later loaders see the freshest atlas_genes/atlas_disease_entities).
    python -m app.loaders.cli run all

None of these spend money or need an API key -- every source here is a free,
public API or bulk file. The only requirement is Supabase write access.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

import httpx

from ..config import get_settings
from . import clinvar, ctgov, epmc, g2p, hpo, monarch, orgs, reporter

LOADERS = {
    "monarch": monarch,
    "hpo": hpo,
    "clinvar": clinvar,
    "g2p": g2p,
    "ctgov": ctgov,
    "reporter": reporter,
    "epmc": epmc,
    "orgs": orgs,
}

# monarch first: resolves atlas_disease_entities.mondo_id and atlas_genes.hgnc_id,
# which the others don't strictly need but benefit from being fresh.
RUN_ORDER = ["monarch", "hpo", "clinvar", "g2p", "ctgov", "reporter", "epmc", "orgs"]


def _configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(levelname)-8s %(name)s: %(message)s",
    )


async def _run_one(name: str) -> int:
    settings = get_settings()
    if not settings.database_configured:
        print("Cannot run. Missing: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        print("See backend/.env.example.", file=sys.stderr)
        return 2

    loader = LOADERS[name]
    async with httpx.AsyncClient() as client:
        print(f"--- {name} ---")
        summary = await loader.run(settings, client)
        for field_name, value in vars(summary).items():
            if isinstance(value, list) and value:
                print(f"  {field_name}:")
                for item in value[:20]:
                    print(f"    {item}")
                if len(value) > 20:
                    print(f"    ... and {len(value) - 20} more")
            else:
                print(f"  {field_name}: {value}")
    return 0


async def _run(names: list[str]) -> int:
    order = RUN_ORDER if names == ["all"] else names
    exit_code = 0
    for name in order:
        code = await _run_one(name)
        exit_code = exit_code or code
    return exit_code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="loaders", description=__doc__)
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="run one or more loaders against Supabase")
    run.add_argument("names", nargs="+", choices=[*LOADERS.keys(), "all"])

    args = parser.parse_args(argv)
    _configure_logging(args.verbose)
    return asyncio.run(_run(args.names))


if __name__ == "__main__":
    raise SystemExit(main())
