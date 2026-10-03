"""Score a verified claim by rule, and say which rule did it.

The model is not asked for a confidence number -- a model's self-reported
certainty is not evidence of anything. Instead a verified claim starts at a
floor and moves on observable facts: who published the page, whether the asset
is named concretely, whether participant counts or eligibility are stated.

Every score returns the sentence that produced it. A judge clicking "why 0.78?"
gets that sentence, not a shrug. The plan requires exactly this.
"""

from __future__ import annotations

from dataclasses import dataclass

# A verified quote on an unidentified site earns this and nothing more.
BASE = 0.50

# Who is making the claim about itself.
KIND_BONUS = {
    "patient organization": 0.20,  # first-party about its own programmes
    "research institution": 0.18,
    "government": 0.20,
    "lab": 0.12,
    "registry": 0.15,
    "unknown": 0.0,
    "social": 0.0,
    "reference": 0.0,
}

# Concretely named infrastructure beats a vague mention.
SPECIFIC_OBJECT_BONUS = 0.08
# A participant count or eligibility criteria means a real programme.
OPERATIONAL_DETAIL_BONUS = 0.07
# A named investigator makes the claim checkable against a person.
NAMED_INVESTIGATOR_BONUS = 0.05
# Long quotes carry their own context.
SUBSTANTIAL_QUOTE_BONUS = 0.05

CEILING = 0.95  # reported evidence never reaches certainty

VAGUE_OBJECT_NAMES = {
    "registry",
    "study",
    "research",
    "program",
    "programme",
    "project",
    "trial",
    "model",
    "dataset",
}


@dataclass(frozen=True)
class Score:
    confidence: float
    rule: str


def score_claim(
    *,
    source_kind: str,
    object_name: str,
    quote: str,
    participants: int | None = None,
    eligibility: str | None = None,
    investigator: str | None = None,
) -> Score:
    """Scores one already-verified claim. Never call this on a rejected claim."""
    confidence = BASE
    reasons: list[str] = ["verified quote on a fetched page (0.50 base)"]

    bonus = KIND_BONUS.get(source_kind, 0.0)
    if bonus:
        confidence += bonus
        reasons.append(f"first-party {source_kind} page (+{bonus:.2f})")
    else:
        reasons.append(f"source kind '{source_kind}' adds nothing")

    named = object_name.strip().lower()
    if named and named not in VAGUE_OBJECT_NAMES and len(named) > 12:
        confidence += SPECIFIC_OBJECT_BONUS
        reasons.append(f"asset named specifically (+{SPECIFIC_OBJECT_BONUS:.2f})")

    if participants is not None or (eligibility and eligibility.strip()):
        confidence += OPERATIONAL_DETAIL_BONUS
        reasons.append(
            f"states participant count or eligibility (+{OPERATIONAL_DETAIL_BONUS:.2f})"
        )

    if investigator and investigator.strip():
        confidence += NAMED_INVESTIGATOR_BONUS
        reasons.append(f"names an investigator (+{NAMED_INVESTIGATOR_BONUS:.2f})")

    if len(quote.strip()) >= 160:
        confidence += SUBSTANTIAL_QUOTE_BONUS
        reasons.append(f"quote carries full context (+{SUBSTANTIAL_QUOTE_BONUS:.2f})")

    capped = min(CEILING, round(confidence, 4))
    if capped < confidence:
        reasons.append(f"capped at {CEILING} -- reported evidence is never certain")

    return Score(confidence=capped, rule="; ".join(reasons))
