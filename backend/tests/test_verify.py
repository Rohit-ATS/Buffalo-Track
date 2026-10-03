"""The verifier is the evidence-integrity claim, so it gets the most tests.

The important cases are the negative ones: a paraphrase, a plausible
invention, and a too-short fragment must all be rejected.
"""

from app.llm.verify import (
    MIN_QUOTE_CHARS,
    Tally,
    Verdict,
    normalize,
    strip_markdown_inline,
    verify_quote,
)

PAGE = """
# STXBP1 Foundation

## Research

The Foundation **launched** a natural history study in 2021 to track
developmental outcomes across the STXBP1 patient population.

Families can join the [patient registry](https://example.org/registry) at any
time, and there is no cost to participate.
"""


def test_verbatim_quote_is_verified():
    quote = "launched a natural history study in 2021 to track developmental outcomes"
    result = verify_quote(quote, PAGE)
    assert result.ok
    assert result.verdict is Verdict.VERIFIED
    assert result.status == "verified"


def test_quote_spanning_a_line_break_is_verified():
    # The source wraps mid-sentence; a model copying it emits one line.
    quote = "a natural history study in 2021 to track developmental outcomes across the STXBP1 patient population"
    assert verify_quote(quote, PAGE).ok


def test_bold_markup_in_the_source_does_not_break_a_match():
    # The page says **launched**; the model copies the word without markup.
    assert verify_quote(
        "The Foundation launched a natural history study in 2021", PAGE
    ).ok


def test_link_markup_in_the_source_does_not_break_a_match():
    assert verify_quote(
        "Families can join the patient registry at any time, and there is no cost", PAGE
    ).ok


def test_paraphrase_is_rejected():
    # True to the page's meaning, but not its words. Must not become evidence.
    result = verify_quote(
        "The foundation started a study in 2021 that follows patient development", PAGE
    )
    assert not result.ok
    assert result.verdict is Verdict.NOT_FOUND
    assert result.status == "rejected"


def test_plausible_invention_is_rejected():
    result = verify_quote(
        "The Foundation operates a biobank with over 400 banked samples", PAGE
    )
    assert not result.ok
    assert result.verdict is Verdict.NOT_FOUND


def test_short_fragment_is_rejected_even_though_it_appears():
    # "Research" is on the page, but it identifies nothing.
    result = verify_quote("Research", PAGE)
    assert not result.ok
    assert result.verdict is Verdict.TOO_SHORT


def test_quote_at_the_length_boundary():
    quote = "x" * MIN_QUOTE_CHARS
    assert verify_quote(quote, f"prefix {quote} suffix").ok
    assert not verify_quote("y" * (MIN_QUOTE_CHARS - 1), "y" * 100).ok


def test_empty_inputs_are_rejected_distinctly():
    assert verify_quote("", PAGE).verdict is Verdict.EMPTY
    assert verify_quote("something long enough to pass the length floor here", "").verdict is (
        Verdict.NO_SOURCE
    )


def test_case_and_whitespace_differences_are_tolerated():
    assert verify_quote(
        "THE   FOUNDATION\n\nLAUNCHED a natural history study in 2021", PAGE
    ).ok


def test_normalize_collapses_whitespace_and_folds_case():
    assert normalize("  The   Registry\nIs  Open ") == "the registry is open"


def test_strip_markdown_keeps_every_word():
    assert strip_markdown_inline("**bold** and [linked](http://x) text") == (
        "bold and linked text"
    )


class TestTally:
    def test_unmeasured_rate_is_none_not_zero(self):
        # An unmeasured rejection rate must never read as a perfect score.
        assert Tally().rejection_rate is None

    def test_counts_and_rate(self):
        tally = Tally()
        tally.record(verify_quote("launched a natural history study in 2021 to track", PAGE))
        tally.record(verify_quote("invented claim about a biobank of 400 samples here", PAGE))
        tally.record(verify_quote("short", PAGE))

        assert tally.checked == 3
        assert tally.verified == 1
        assert tally.rejected == 2
        assert tally.rejection_rate == 0.6667
        assert tally.by_verdict == {"verified": 1, "not_found": 1, "too_short": 1}
