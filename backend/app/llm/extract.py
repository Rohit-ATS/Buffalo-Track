"""Turn a fetched page into structured claims.

The model's only job is reading: it names what an organization operates and
copies the sentence that says so. It never scores, never infers, never fills a
gap. Scoring happens after the verifier, by rule.

Two constraints shape the prompt:

* Every claim must carry a quote copied character-for-character from the page.
  The verifier drops anything else, so inventing is pointless rather than
  merely discouraged.
* An empty list is a valid answer. Most pages describe no asset, and a model
  that feels obliged to return something will manufacture it.

Structured Outputs enforces the shape, so there is no JSON repair here.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx

LOG = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"

SUBJECT_TYPES = ("organization", "researcher", "institution")
OBJECT_TYPES = (
    "registry",
    "natural history study",
    "trial",
    "model",
    "biomarker",
    "biobank",
    "outcome measure",
    "dataset",
    "protocol",
    "grant program",
)
PREDICATES = ("operates", "maintains", "funds", "studies", "contact_for")

SYSTEM_PROMPT = """You read one web page and report only what it states.

Rules:
- Report a claim only if the page explicitly states it. Never infer, never use
  background knowledge, never fill a gap.
- Every claim must include `quote`: a span copied character-for-character from
  the page text you were given. Do not fix typos, re-wrap lines, or shorten it.
  A claim whose quote cannot be found in the page is discarded automatically.
- The quote must be long enough to identify the claim on its own: at least one
  full sentence or clause, 40 characters or more.
- Return an empty list if the page describes no research asset. Most pages do
  not. An empty list is a correct and useful answer.
- Do not score confidence. That is decided later, by rule.
"""

# Structured Outputs schema. additionalProperties:false and a full `required`
# list are both mandatory for strict mode.
CLAIM_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["claims"],
    "properties": {
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "subject_type",
                    "subject_name",
                    "predicate",
                    "object_type",
                    "object_name",
                    "quote",
                    "gene",
                    "eligibility",
                    "investigator",
                    "participants",
                ],
                "properties": {
                    "subject_type": {"type": "string", "enum": list(SUBJECT_TYPES)},
                    "subject_name": {"type": "string"},
                    "predicate": {"type": "string", "enum": list(PREDICATES)},
                    "object_type": {"type": "string", "enum": list(OBJECT_TYPES)},
                    "object_name": {"type": "string"},
                    "quote": {"type": "string"},
                    # Nullable rather than optional: strict mode requires every
                    # property to be listed in `required`.
                    "gene": {"type": ["string", "null"]},
                    "eligibility": {"type": ["string", "null"]},
                    "investigator": {"type": ["string", "null"]},
                    "participants": {"type": ["integer", "null"]},
                },
            },
        }
    },
}


@dataclass(frozen=True)
class Claim:
    subject_type: str
    subject_name: str
    predicate: str
    object_type: str
    object_name: str
    quote: str
    gene: str | None = None
    eligibility: str | None = None
    investigator: str | None = None
    participants: int | None = None


class ExtractionError(RuntimeError):
    """The extraction call failed in a way the caller should see."""


# Pages are truncated before sending: the top of a foundation page holds the
# substance, and the tail is navigation and footers.
MAX_PROMPT_CHARS = 24_000


def _user_prompt(url: str, content: str) -> str:
    body = content[:MAX_PROMPT_CHARS]
    return (
        f"Page URL: {url}\n\n"
        "Report the research assets this page states its subject operates, "
        "maintains, funds, or studies.\n\n"
        "--- PAGE TEXT ---\n"
        f"{body}\n"
        "--- END PAGE TEXT ---"
    )


class ClaimExtractor:
    """Calls the model with Structured Outputs and returns parsed claims."""

    def __init__(
        self,
        client: httpx.AsyncClient,
        api_key: str,
        model: str,
        prompt_version: str,
    ) -> None:
        self._client = client
        self._api_key = api_key
        self._model = model
        self.prompt_version = prompt_version

    @property
    def method(self) -> str:
        """Recorded on every claim, so a bad batch can be traced to a version."""
        return f"{self._model}/{self.prompt_version}"

    async def extract(self, url: str, content: str) -> list[Claim]:
        if not content.strip():
            return []

        payload = {
            "model": self._model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _user_prompt(url, content)},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "asset_claims",
                    "strict": True,
                    "schema": CLAIM_SCHEMA,
                },
            },
        }

        try:
            response = await self._client.post(
                OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=httpx.Timeout(90.0, connect=15.0),
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise ExtractionError(f"Extraction request failed for {url}: {error}") from error

        return parse_claims(response.json(), url)


def parse_claims(payload: dict[str, Any], url: str) -> list[Claim]:
    """Pulls claims out of a chat-completions response."""
    try:
        text = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise ExtractionError(f"Unexpected extraction response for {url}") from error

    if not isinstance(text, str) or not text.strip():
        return []

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        # Strict mode should prevent this; if it happens, drop the batch rather
        # than guessing at a repair.
        raise ExtractionError(f"Extraction returned invalid JSON for {url}") from error

    raw_claims = parsed.get("claims") if isinstance(parsed, dict) else None
    if not isinstance(raw_claims, list):
        return []

    claims: list[Claim] = []
    for raw in raw_claims:
        if not isinstance(raw, dict):
            continue
        try:
            claims.append(
                Claim(
                    subject_type=str(raw["subject_type"]),
                    subject_name=str(raw["subject_name"]).strip(),
                    predicate=str(raw["predicate"]),
                    object_type=str(raw["object_type"]),
                    object_name=str(raw["object_name"]).strip(),
                    quote=str(raw["quote"]),
                    gene=_opt_str(raw.get("gene")),
                    eligibility=_opt_str(raw.get("eligibility")),
                    investigator=_opt_str(raw.get("investigator")),
                    participants=raw.get("participants")
                    if isinstance(raw.get("participants"), int)
                    else None,
                )
            )
        except KeyError as error:
            LOG.warning("skipping malformed claim from %s: missing %s", url, error)
    return claims


def _opt_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None
