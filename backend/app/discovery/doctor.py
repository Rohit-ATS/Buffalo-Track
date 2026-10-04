"""Check the discovery setup before paying for a real run.

Each credential is exercised with the smallest real call that proves it works,
and every failure reports the fix rather than the traceback. Four checks, about
two billable Bright Data requests and a fraction of a cent of model tokens
total — far cheaper than discovering a wrong zone name halfway through a run
over nine genes.

The Bright Data zone checks are the ones that matter. The API key being valid
says nothing about whether a zone called `serp_api1` exists in that account:
zone names are chosen when the product is added, and a mismatch fails per
request, not at auth.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import anthropic
import httpx

from ..brightdata.client import API_URL, BrightDataError
from ..config import Settings


@dataclass
class Check:
    name: str
    ok: bool
    detail: str
    fix: str | None = None

    def render(self) -> str:
        mark = "PASS" if self.ok else "FAIL"
        out = f"{mark}  {self.name}\n      {self.detail}"
        if self.fix and not self.ok:
            out += f"\n      fix: {self.fix}"
        return out


async def check_supabase(settings: Settings, client: httpx.AsyncClient) -> Check:
    name = "Supabase (service role)"
    if not settings.database_configured:
        return Check(
            name,
            False,
            "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.",
            "Fill both in backend/.env. The URL is https://<ref>.supabase.co, not the db host.",
        )

    key = settings.supabase_service_role_key or ""
    url = f"{str(settings.supabase_url).rstrip('/')}/rest/v1/atlas_web_sources"
    try:
        response = await client.get(
            url,
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            params={"select": "id", "limit": "1"},
            timeout=httpx.Timeout(20.0),
        )
    except httpx.HTTPError as error:
        return Check(name, False, f"Could not reach Supabase: {error}", "Check the URL and network.")

    if response.status_code == 404:
        return Check(
            name,
            False,
            "Connected, but atlas_web_sources does not exist.",
            "Apply the migrations: supabase db push (see supabase/README.md).",
        )
    if response.status_code >= 400:
        return Check(
            name,
            False,
            f"HTTP {response.status_code}: {response.text[:120]}",
            "Confirm the service-role key belongs to this project.",
        )
    return Check(name, True, "Connected and the discovery tables exist.")


async def check_serp(settings: Settings, client: httpx.AsyncClient) -> Check:
    name = f"Bright Data SERP zone ({settings.bright_data_serp_zone})"
    if not settings.bright_data_configured:
        return Check(
            name,
            False,
            "BRIGHT_DATA_API_KEY is not set.",
            "Bright Data dashboard -> Account settings -> API tokens. Paste it into backend/.env.",
        )

    try:
        response = await client.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {settings.bright_data_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "zone": settings.bright_data_serp_zone,
                "url": "https://www.google.com/search?q=test&brd_json=1",
                "format": "json",
            },
            timeout=httpx.Timeout(90.0),
        )
    except httpx.HTTPError as error:
        return Check(name, False, f"Request failed: {error}", "Check network access to Bright Data.")

    verdict = _zone_verdict(name, response, settings.bright_data_serp_zone, kind="SERP API")
    if verdict.ok and len(response.text) < 500:
        # A 200 with almost nothing in it means the request shape is wrong, not
        # that the zone is missing. Worth failing loudly: discovery would
        # otherwise find no URLs and report an empty run as a success.
        return Check(
            name,
            False,
            f"Zone answered but returned only {len(response.text)} bytes.",
            "The SERP request needs format=json with brd_json=1 in the URL.",
        )
    return verdict


async def check_unlocker(settings: Settings, client: httpx.AsyncClient) -> Check:
    name = f"Bright Data Unlocker zone ({settings.bright_data_unlocker_zone})"
    if not settings.bright_data_configured:
        return Check(name, False, "BRIGHT_DATA_API_KEY is not set.", "See the SERP check above.")

    try:
        response = await client.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {settings.bright_data_api_key}",
                "Content-Type": "application/json",
            },
            json={
                # A tiny, stable page: this is a plumbing check, not a scrape.
                "zone": settings.bright_data_unlocker_zone,
                "url": "https://example.com",
                "format": "raw",
                "data_format": "markdown",
            },
            timeout=httpx.Timeout(90.0),
        )
    except httpx.HTTPError as error:
        return Check(name, False, f"Request failed: {error}", "Check network access to Bright Data.")

    verdict = _zone_verdict(name, response, settings.bright_data_unlocker_zone, kind="Web Unlocker")
    if verdict.ok and not response.text.strip():
        return Check(name, False, "Zone accepted the request but returned an empty body.", None)
    return verdict


def _zone_verdict(name: str, response: httpx.Response, zone: str, *, kind: str) -> Check:
    if response.status_code == 401:
        return Check(
            name,
            False,
            "Bright Data rejected the token (401).",
            "Regenerate the API token and paste it into backend/.env.",
        )

    body = response.text[:200]
    # A missing or misnamed zone comes back as a 4xx naming the zone, not a 401.
    if response.status_code >= 400:
        looks_like_zone = "zone" in body.lower()
        return Check(
            name,
            False,
            f"HTTP {response.status_code}: {body}",
            (
                f"Add a {kind} zone in the Bright Data dashboard and name it exactly "
                f"'{zone}', or set the matching name in backend/.env."
            )
            if looks_like_zone
            else f"Confirm the {kind} product is enabled on this account.",
        )

    return Check(name, True, f"Zone '{zone}' answered ({len(response.text)} bytes).")


async def check_anthropic(settings: Settings) -> Check:
    name = f"Anthropic ({settings.anthropic_extract_model})"
    if not settings.anthropic_configured:
        return Check(
            name,
            False,
            "ANTHROPIC_API_KEY is not set.",
            "console.anthropic.com -> API keys. Paste it into backend/.env.",
        )

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    try:
        response = await client.messages.create(
            model=settings.anthropic_extract_model,
            max_tokens=8,
            messages=[{"role": "user", "content": "Reply with the single word: ready"}],
        )
    except anthropic.NotFoundError:
        return Check(
            name,
            False,
            f"Model '{settings.anthropic_extract_model}' was not found.",
            "Set ANTHROPIC_EXTRACT_MODEL=claude-haiku-4-5 in backend/.env.",
        )
    except anthropic.AuthenticationError:
        return Check(name, False, "The API key was rejected.", "Regenerate it in the console.")
    except anthropic.APIStatusError as error:
        return Check(name, False, f"HTTP {error.status_code}", "Check the account's credit balance.")
    except httpx.HTTPError as error:
        return Check(name, False, f"Could not reach the API: {error}", None)
    finally:
        await client.close()

    used = response.usage.input_tokens + response.usage.output_tokens
    return Check(name, True, f"Model answered ({used} tokens, well under a cent).")


async def run_doctor() -> int:
    """Runs every check and returns a process exit code."""
    from ..config import get_settings

    settings = get_settings()
    print("Checking the discovery setup. Two billable Bright Data requests, no more.\n")

    async with httpx.AsyncClient() as client:
        checks = [
            await check_supabase(settings, client),
            await check_serp(settings, client),
            await check_unlocker(settings, client),
            await check_anthropic(settings),
        ]

    for check in checks:
        print(check.render())
        print()

    failed = [c for c in checks if not c.ok]
    if failed:
        print(f"{len(failed)} of {len(checks)} checks failed. Fix those before running discovery.")
        return 1

    print("All checks passed. Ready for:")
    print("  python -m app.discovery.cli run STX1B --disease-id stx1b --max-pages 6")
    return 0


def summarize_json(checks: list[Check]) -> str:
    """Machine-readable form, for a CI step."""
    return json.dumps(
        [{"name": c.name, "ok": c.ok, "detail": c.detail} for c in checks], indent=2
    )
