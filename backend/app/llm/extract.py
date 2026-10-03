"""Turn a fetched page into structured claims, using Claude Haiku 4.5.

Haiku is the cheapest current model ($1 / $5 per MTok) and the right tier for
this job: the model is only reading and copying, and anything it invents is
discarded by the verifier regardless. No thinking is requested — reasoning
depth buys nothing when the task is "quote the sentence that says this".

Structured outputs do the schema work. `messages.parse()` validates the
response against a Pydantic model, so there is no JSON repair path and no
hand-rolled parser.

Two constraints shape the prompt:

* Every claim must carry a quote copied character-for-character from the page.
  The verifier drops anything else, so inventing is pointless rather than
  merely discouraged.
* An empty list is a valid answer. Most pages describe no asset, and a model
  that feels obliged to return something will manufacture it.
"""

from __future__ import annotations

import logging
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

LOG = logging.getLogger(__name__)

SubjectType = Literal["organization", "researcher", "institution"]
Predicate = Literal["operates", "maintains", "funds", "studies", "contact_for"]
ObjectType = Literal[
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
]

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

# Pages are truncated before sending: the top of a foundation page holds the
# substance, and the tail is navigation and footers.
MAX_PROMPT_CHARS = 24_000
# Generous enough for a page describing several assets, without inviting an
# essay. Claims are short; this is never the binding constraint in practice.
MAX_TOKENS = 4096


class Claim(BaseModel):
    """One asset claim, as the model read it off the page."""

    subject_type: SubjectType
    subject_name: str
    predicate: Predicate
    object_type: ObjectType
    object_name: str
    quote: str = Field(description="Verbatim span copied from the page text")
    gene: str | None = None
    eligibility: str | None = None
    investigator: str | None = None
    participants: int | None = None


class ClaimBatch(BaseModel):
    claims: list[Claim]


class ExtractionError(RuntimeError):
    """The extraction call failed in a way the caller should see."""


def _user_prompt(url: str, content: str) -> str:
    return (
        f"Page URL: {url}\n\n"
        "Report the research assets this page states its subject operates, "
        "maintains, funds, or studies.\n\n"
        "--- PAGE TEXT ---\n"
        f"{content[:MAX_PROMPT_CHARS]}\n"
        "--- END PAGE TEXT ---"
    )


class ClaimExtractor:
    """Reads one page into validated claims."""

    def __init__(
        self,
        client: anthropic.AsyncAnthropic,
        model: str,
        prompt_version: str,
    ) -> None:
        self._client = client
        self._model = model
        self.prompt_version = prompt_version

    @property
    def method(self) -> str:
        """Recorded on every claim, so a bad batch can be traced to a version."""
        return f"{self._model}/{self.prompt_version}"

    async def extract(self, url: str, content: str) -> list[Claim]:
        if not content.strip():
            return []

        try:
            response = await self._client.messages.parse(
                model=self._model,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": _user_prompt(url, content)}],
                output_format=ClaimBatch,
            )
        # Most specific first: a 404 on the model name is not a rate limit, and
        # neither is a dropped connection.
        except anthropic.NotFoundError as error:
            raise ExtractionError(
                f"Model {self._model!r} not found — check ANTHROPIC_EXTRACT_MODEL"
            ) from error
        except anthropic.AuthenticationError as error:
            raise ExtractionError("ANTHROPIC_API_KEY was rejected") from error
        except anthropic.RateLimitError as error:
            raise ExtractionError(f"Rate limited extracting {url}") from error
        except anthropic.APIStatusError as error:
            raise ExtractionError(
                f"Extraction failed for {url}: HTTP {error.status_code}"
            ) from error
        except anthropic.APIConnectionError as error:
            raise ExtractionError(f"Could not reach the API for {url}") from error

        # Safety classifiers can decline a page; `content` is not meaningful then.
        if response.stop_reason == "refusal":
            LOG.warning("extraction refused for %s", url)
            return []

        if response.stop_reason == "max_tokens":
            # A truncated batch would silently lose claims, and a half-written
            # quote would fail the verifier for the wrong reason.
            LOG.warning("extraction hit max_tokens for %s; discarding batch", url)
            return []

        batch = response.parsed_output
        if batch is None:
            LOG.warning("extraction returned no parsed output for %s", url)
            return []

        return list(batch.claims)
