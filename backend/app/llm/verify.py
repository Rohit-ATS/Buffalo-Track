"""The quote verifier.

A model claim becomes evidence only if its quote is found in the page the model
was shown. No match, no edge. This is twenty minutes of code and it is the
whole evidence-integrity story: it makes "the model said so" structurally
impossible to confuse with "the source said so".

Normalisation is deliberately narrow. Whitespace collapsing and case folding
are safe -- they do not change what a sentence asserts. Anything more
aggressive (stripping punctuation, stemming, fuzzy ratios) would let a
paraphrase pass as a quote, which defeats the point.

Markdown is the one real exception: Unlocker returns text where a source
sentence may carry **bold** or [link](url) markup that the model drops when
copying. `strip_markdown_inline` removes only inline emphasis and link syntax,
never words.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

# Shortest span we will treat as a quote. Below this, a "match" is noise: the
# word "registry" appears on every foundation page.
MIN_QUOTE_CHARS = 40

_WHITESPACE = re.compile(r"\s+")
_MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_MD_EMPHASIS = re.compile(r"(\*\*|__|\*|_|`)")


class Verdict(str, Enum):
    VERIFIED = "verified"
    NOT_FOUND = "not_found"
    TOO_SHORT = "too_short"
    EMPTY = "empty"
    NO_SOURCE = "no_source"


@dataclass(frozen=True)
class Result:
    verdict: Verdict
    ok: bool
    reason: str

    @property
    def status(self) -> str:
        """Maps onto the extraction_status enum in the migration."""
        return "verified" if self.ok else "rejected"


def strip_markdown_inline(text: str) -> str:
    """Drops inline markdown syntax, keeping every word.

    `[the registry](https://x)` -> `the registry`
    `**launched** a study`      -> `launched a study`
    """
    text = _MD_LINK.sub(r"\1", text)
    return _MD_EMPHASIS.sub("", text)


def normalize(text: str) -> str:
    """Collapse whitespace, fold case, drop inline markdown. Nothing else."""
    return _WHITESPACE.sub(" ", strip_markdown_inline(text)).strip().lower()


def verify_quote(quote: str, source: str) -> Result:
    """True only when `quote` appears verbatim in `source` after normalisation."""
    if not source or not source.strip():
        return Result(Verdict.NO_SOURCE, False, "No source text to verify against")

    if not quote or not quote.strip():
        return Result(Verdict.EMPTY, False, "Claim carried no quote")

    normalized_quote = normalize(quote)
    if len(normalized_quote) < MIN_QUOTE_CHARS:
        return Result(
            Verdict.TOO_SHORT,
            False,
            f"Quote is {len(normalized_quote)} chars; {MIN_QUOTE_CHARS} required to be "
            "distinctive",
        )

    if normalized_quote in normalize(source):
        return Result(Verdict.VERIFIED, True, "Quote found verbatim in the fetched page")

    return Result(
        Verdict.NOT_FOUND,
        False,
        "Quote does not appear in the fetched page; the model paraphrased or invented it",
    )


@dataclass
class Tally:
    """Rejection-rate counters for the methods page."""

    checked: int = 0
    verified: int = 0
    rejected: int = 0
    by_verdict: dict[str, int] | None = None

    def record(self, result: Result) -> None:
        if self.by_verdict is None:
            self.by_verdict = {}
        self.checked += 1
        if result.ok:
            self.verified += 1
        else:
            self.rejected += 1
        key = result.verdict.value
        self.by_verdict[key] = self.by_verdict.get(key, 0) + 1

    @property
    def rejection_rate(self) -> float | None:
        """None rather than 0.0 when nothing was checked -- an unmeasured rate
        is not a perfect one."""
        if self.checked == 0:
            return None
        return round(self.rejected / self.checked, 4)
