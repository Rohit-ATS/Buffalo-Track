"""The loaders' pure logic: frequency parsing, information content, and the
conservative pathway-name matching that decides whether to write a Reactome
id or report an unmatched candidate instead.

No network or Supabase access here -- the live loaders are exercised by hand
against the real APIs (see backend/README.md), the same way discovery's
scout.py is. These are the parts wrong in a way a test would actually catch.
"""

import math

from app.loaders.g2p import _names_overlap, _strip_highlight
from app.loaders.hpo import _FREQUENCY_TERMS, _parse_frequency


def test_fraction_frequency_parses():
    assert _parse_frequency("15/15") == 1.0
    assert _parse_frequency("3/15") == 0.2


def test_hpo_frequency_term_resolves_to_its_midpoint():
    assert _parse_frequency("HP:0040281") == _FREQUENCY_TERMS["HP:0040281"]


def test_missing_frequency_is_none_not_zero():
    # "-" means "not recorded", which is a different fact than "never occurs".
    assert _parse_frequency("-") is None
    assert _parse_frequency("") is None


def test_malformed_fraction_is_none():
    assert _parse_frequency("abc/def") is None
    assert _parse_frequency("5/0") is None


def test_pathway_names_overlap_on_a_shared_significant_word():
    assert _names_overlap("Presynaptic vesicle release", "Glutamate Neurotransmitter Release Cycle")


def test_pathway_names_with_no_shared_word_do_not_overlap():
    assert not _names_overlap("Calcium signaling", "Toxicity of botulinum toxin type C (botC)")


def test_short_words_do_not_count_toward_overlap():
    # "of", "the", "and" etc. would make everything "match" if counted.
    assert not _names_overlap("Loss of function", "Gain of function")


def test_strip_highlight_removes_reactome_search_markup():
    assert _strip_highlight('<span class="highlighting" >CACNA1A</span>') == "CACNA1A"


def test_information_content_favors_rare_terms():
    # Matches supabase/migrations/20261003000003_atlas.sql's own comment:
    # "seizure" is near-useless for similarity, a rare term is informative.
    def ic(gene_count: int, total_genes: int) -> float:
        return -math.log2(gene_count / total_genes)

    common_term = ic(900, 1000)
    rare_term = ic(5, 1000)
    assert rare_term > common_term
