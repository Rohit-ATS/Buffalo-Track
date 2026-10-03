"""The extractor's own contract.

The pipeline test stubs this out, so the behaviour that matters here is how a
non-ideal response is handled: a refusal, a truncated batch, an auth failure.
Each of those must not become a silent empty page or an unhandled traceback
halfway through a paid run.
"""

from __future__ import annotations

import asyncio
from typing import Any

import anthropic
import httpx
import pytest

from app.llm.extract import Claim, ClaimBatch, ClaimExtractor, ExtractionError

PAGE = """
The Alliance maintains the STX1B Patient Registry, which has enrolled 214
families across eleven countries since 2019.
"""

GOOD_CLAIM = Claim(
    subject_type="organization",
    subject_name="STX1B Family Alliance",
    predicate="maintains",
    object_type="registry",
    object_name="STX1B Patient Registry",
    quote="maintains the STX1B Patient Registry, which has enrolled 214 families",
    participants=214,
)


class FakeMessages:
    """Stands in for client.messages, recording the request it was given."""

    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self._response = response
        self._error = error
        self.calls: list[dict[str, Any]] = []

    async def parse(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self._error is not None:
            raise self._error
        return self._response


class FakeClient:
    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self.messages = FakeMessages(response, error)


class FakeResponse:
    def __init__(self, stop_reason: str, parsed_output: ClaimBatch | None) -> None:
        self.stop_reason = stop_reason
        self.parsed_output = parsed_output


def extractor(client: Any) -> ClaimExtractor:
    return ClaimExtractor(client, "claude-haiku-4-5", "extract-v1")


def run(coro):  # noqa: ANN001, ANN201
    return asyncio.run(coro)


def _api_error(status: int) -> anthropic.APIStatusError:
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(status, request=request, json={"error": {}})
    return anthropic.APIStatusError("boom", response=response, body=None)


def test_returns_parsed_claims():
    client = FakeClient(FakeResponse("end_turn", ClaimBatch(claims=[GOOD_CLAIM])))
    claims = run(extractor(client).extract("https://example.org/research", PAGE))

    assert len(claims) == 1
    assert claims[0].object_name == "STX1B Patient Registry"
    assert claims[0].participants == 214


def test_sends_the_page_and_asks_for_the_schema():
    client = FakeClient(FakeResponse("end_turn", ClaimBatch(claims=[])))
    run(extractor(client).extract("https://example.org/research", PAGE))

    call = client.messages.calls[0]
    assert call["model"] == "claude-haiku-4-5"
    assert call["output_format"] is ClaimBatch
    assert "STX1B Patient Registry" in call["messages"][0]["content"]
    # No thinking is requested: reasoning depth buys nothing when the task is
    # to copy a sentence, and it would cost tokens on every page.
    assert "thinking" not in call


def test_empty_page_short_circuits_without_a_call():
    client = FakeClient(FakeResponse("end_turn", ClaimBatch(claims=[])))
    assert run(extractor(client).extract("https://example.org", "   ")) == []
    assert client.messages.calls == []


def test_empty_claim_list_is_a_valid_answer():
    client = FakeClient(FakeResponse("end_turn", ClaimBatch(claims=[])))
    assert run(extractor(client).extract("https://example.org", PAGE)) == []


def test_a_refusal_yields_no_claims_rather_than_raising():
    client = FakeClient(FakeResponse("refusal", None))
    assert run(extractor(client).extract("https://example.org", PAGE)) == []


def test_a_truncated_batch_is_discarded_whole():
    # A half-written quote would fail the verifier for the wrong reason, and a
    # truncated list would silently lose claims.
    client = FakeClient(FakeResponse("max_tokens", ClaimBatch(claims=[GOOD_CLAIM])))
    assert run(extractor(client).extract("https://example.org", PAGE)) == []


def test_missing_parsed_output_is_handled():
    client = FakeClient(FakeResponse("end_turn", None))
    assert run(extractor(client).extract("https://example.org", PAGE)) == []


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (anthropic.NotFoundError("no model", response=httpx.Response(
            404, request=httpx.Request("POST", "https://api.anthropic.com")), body=None),
         "ANTHROPIC_EXTRACT_MODEL"),
        (anthropic.AuthenticationError("bad key", response=httpx.Response(
            401, request=httpx.Request("POST", "https://api.anthropic.com")), body=None),
         "ANTHROPIC_API_KEY"),
        (anthropic.RateLimitError("slow down", response=httpx.Response(
            429, request=httpx.Request("POST", "https://api.anthropic.com")), body=None),
         "Rate limited"),
        (_api_error(500), "HTTP 500"),
    ],
)
def test_api_failures_become_actionable_extraction_errors(error, expected):  # noqa: ANN001
    client = FakeClient(error=error)
    with pytest.raises(ExtractionError, match=expected):
        run(extractor(client).extract("https://example.org", PAGE))


def test_method_records_model_and_prompt_version():
    # Stored on every claim, so a bad batch can be traced to what produced it.
    assert extractor(FakeClient()).method == "claude-haiku-4-5/extract-v1"


def test_long_pages_are_truncated_before_sending():
    client = FakeClient(FakeResponse("end_turn", ClaimBatch(claims=[])))
    # A URL with no "x" in it, so the count below measures only the page body.
    run(extractor(client).extract("https://alliance.org", "x" * 50_000))

    sent = client.messages.calls[0]["messages"][0]["content"]
    assert sent.count("x") == 24_000
