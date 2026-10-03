# Web discovery (Bright Data)

Official biomedical sources — Monarch, MONDO, HPO, ClinVar, ClinGen,
ClinicalTrials.gov, RePORTER, Europe PMC — have APIs and bulk files. Use them.

This layer covers what they miss: **patient organizations and the research
infrastructure they own.** Registries, natural history programmes, biobanks,
models, outcome measures. That information lives on foundation websites, not in
a database with an endpoint.

```
seed term (gene or disease)
   │
   ├─ SERP API ─────────────► candidate URLs          (billable)
   │                              │
   │                        domain classifier         (free)
   │                              │
   ├─ Web Unlocker / Crawl ──► page markdown          (billable)
   │                              │
   ├─ Claude Haiku extract ──► structured claims      (billable)
   │                              │
   │                        quote verifier            (free, and it is the gate)
   │                              │
   │                        score by rule             (free)
   │                              ▼
   └──────────────────────────► Supabase
                                  │
                        the website reads this
```

The two free stages sit either side of the expensive ones deliberately. The
classifier decides what is worth fetching; the verifier decides what was worth
extracting.

## Run it

```bash
cd backend
pip install -r requirements.txt

# What would this cost? Spends nothing.
python -m app.discovery.cli plan STXBP1 STX1B SNAP25

# Run one term.
python -m app.discovery.cli run STX1B --disease-id stx1b --max-pages 6
```

Needs `BRIGHT_DATA_API_KEY`, `ANTHROPIC_API_KEY`, and Supabase credentials — see
`.env.example`. `run` refuses to start if any are missing and names which.

## Where the credits go

`plan` prints an estimate before you spend. Ten SERP queries per term, up to
eight page fetches, so roughly **18 billable requests per gene**. Nine
mechanism units is around 160.

`BRIGHT_DATA_MAX_REQUESTS` (default 200) is a hard stop per run. A run that
hits it records where it stopped rather than losing the work already done.

Deliberately **not** scraped, because they have proper APIs — scraping them
would be money burned:

| Skipped | Use instead |
| --- | --- |
| clinicaltrials.gov | official API |
| PubMed / Europe PMC | official API |
| NIH RePORTER | official API |
| HPO, Monarch, Orphanet, OMIM | bulk files |

Social and wiki domains are skipped too: useful for spotting an organization's
real name, never acceptable as evidence.

## Why Claude Haiku 4.5

The model's whole job is to read a page and copy the sentence that supports
each claim. It never scores, never infers, and anything it invents is thrown
away by the verifier. That makes this the cheapest useful tier —
**`claude-haiku-4-5`, $1 / $5 per MTok** — and no thinking is requested, since
reasoning depth buys nothing on a copy task and would cost tokens on every
page.

Structured outputs do the schema work: `messages.parse()` validates against a
Pydantic model, so a malformed batch is impossible rather than something to
repair. A truncated batch (`max_tokens`) is discarded whole — a half-written
quote would fail the verifier for the wrong reason.

Cost scales with page size, not claim count. At roughly 6K input tokens per
page (24K chars, truncated) and a few hundred output tokens, a page costs on
the order of a hundredth of a cent. Extraction is not where the money goes;
Bright Data requests are.

## The verifier is the point

The model reads one page and copies the sentence that supports each claim. Then:

```
normalise whitespace + case, strip inline markdown
is the quote a substring of the page we fetched?
   yes → store as evidence, score it by rule
   no  → store as rejected, with the reason
```

A paraphrase fails. An invention fails. A quote under 40 characters fails even
if it does appear, because "registry" is on every foundation page and
identifies nothing.

Rejected claims are **kept**, with their reason. The rejection rate is a
headline number on the methods page and cannot be computed from rows that were
thrown away. `atlas_extraction_quality` serves it.

Confidence is never asked of the model — a model's self-reported certainty is
not evidence. A verified claim starts at 0.50 and moves on observable facts
(first-party publisher, concretely named asset, stated participant count or
eligibility, named investigator), capped at 0.95. Every score carries the
sentence that produced it, so "why 0.78?" has a real answer.

## Evidence tiers

Nothing from this layer is ever `observed`.

| Tier | Source |
| --- | --- |
| observed | structured records: ClinVar, ClinGen, HPO, ClinicalTrials.gov, RePORTER |
| reported | **this layer** — a page said so, and the quote verified |
| inferred | our own computation: similarity, clusters, bridges, suggested actions |

## It runs offline

A visitor's browser never calls Bright Data and never fetches a page. The
pipeline writes to Supabase; the site reads what it stored. Twenty judges
searching the same gene costs nothing and answers in milliseconds.

The only live part is Realtime: the pipeline writes a row per processed page,
so `use-realtime-discoveries.ts` shows assets appearing one at a time while a
run is in flight.

## Tables

| Table | Holds |
| --- | --- |
| `atlas_discovery_runs` | one row per invocation, with counters |
| `atlas_serp_results` | every candidate URL with the classifier's verdict and reason |
| `atlas_web_sources` | fetched pages, with content and a hash for change detection |
| `atlas_web_claims` | extracted claims, verified and rejected alike |
| `atlas_discovered_assets` | verified claims promoted to reusable infrastructure |

Page content is stored so the verifier can be re-run after a prompt change
without paying to refetch.

## Not built yet

- **Web Scraper API / Browser API.** The order of preference is official API →
  Unlocker → Crawl → Browser. Only the middle two are implemented; nothing in
  the current slice needed a real browser.
- **Researcher discovery.** `researcher_queries` exists and the CLI takes
  `--researchers`, but promoting a person to `atlas_researchers` with an ORCID
  is not wired. An unresolved name must never be presented as a confirmed
  contact.
- **Entity reconciliation.** A claim's `subject_name` is stored as the page
  wrote it. Two spellings of one foundation will not merge yet.
