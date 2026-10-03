"""Shared transport for Bright Data's unified /request endpoint.

Every product below (SERP, Web Unlocker, Crawl) posts to the same endpoint with
a bearer token and a `zone`; only the payload differs. This module owns the
things they share: the budget guard, retries, and the usage tally.

Bright Data bills per successful delivery, so `RequestBudget` counts requests
that actually returned a body and refuses to issue more than the configured
cap. That cap is the difference between a bug costing a few cents and a bug
costing the whole credit balance.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

import httpx

from ..config import Settings

LOG = logging.getLogger(__name__)

API_URL = "https://api.brightdata.com/request"

# Bright Data's own guidance is to retry transient failures; anti-bot work can
# make a single fetch slow, so the timeout is generous relative to our APIs.
DEFAULT_TIMEOUT = httpx.Timeout(90.0, connect=15.0)
RETRY_STATUSES = frozenset({429, 500, 502, 503, 504})
MAX_ATTEMPTS = 3


class BrightDataError(RuntimeError):
    """A Bright Data request failed in a way the caller should see."""


class BudgetExhausted(BrightDataError):
    """The per-run cap on billable requests was reached."""


@dataclass
class RequestBudget:
    """Counts billable requests and stops the run at the cap."""

    limit: int
    spent: int = 0
    by_zone: dict[str, int] = field(default_factory=dict)

    def check(self) -> None:
        if self.spent >= self.limit:
            raise BudgetExhausted(
                f"Bright Data request cap reached ({self.spent}/{self.limit}). "
                "Raise BRIGHT_DATA_MAX_REQUESTS to continue."
            )

    def charge(self, zone: str) -> None:
        self.spent += 1
        self.by_zone[zone] = self.by_zone.get(zone, 0) + 1

    @property
    def remaining(self) -> int:
        return max(0, self.limit - self.spent)


class BrightDataClient:
    """Thin async wrapper over the /request endpoint."""

    def __init__(
        self,
        settings: Settings,
        client: httpx.AsyncClient,
        budget: RequestBudget | None = None,
    ) -> None:
        if not settings.bright_data_api_key:
            raise BrightDataError(
                "BRIGHT_DATA_API_KEY is not set. See backend/.env.example."
            )
        self._api_key = settings.bright_data_api_key
        self._client = client
        self.budget = budget or RequestBudget(limit=settings.bright_data_max_requests)

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def post(self, payload: dict[str, object]) -> httpx.Response:
        """Issues one billable request, retrying transient failures."""
        zone = str(payload.get("zone", "unknown"))
        self.budget.check()

        last_error: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = await self._client.post(
                    API_URL, headers=self._headers, json=payload, timeout=DEFAULT_TIMEOUT
                )
            except httpx.HTTPError as error:  # network-level failure, nothing delivered
                last_error = error
                LOG.warning("bright data transport error (attempt %s): %s", attempt, error)
            else:
                if response.status_code in RETRY_STATUSES and attempt < MAX_ATTEMPTS:
                    LOG.warning(
                        "bright data returned %s for zone %s (attempt %s)",
                        response.status_code,
                        zone,
                        attempt,
                    )
                    last_error = BrightDataError(f"HTTP {response.status_code}")
                else:
                    if response.status_code >= 400:
                        raise BrightDataError(
                            f"Bright Data returned HTTP {response.status_code}: "
                            f"{response.text[:300]}"
                        )
                    # Delivered, so it is billable.
                    self.budget.charge(zone)
                    return response

            # Linear backoff: enough to clear a rate limit without stalling a run.
            await asyncio.sleep(attempt * 2)

        raise BrightDataError(
            f"Bright Data request failed after {MAX_ATTEMPTS} attempts: {last_error}"
        )
