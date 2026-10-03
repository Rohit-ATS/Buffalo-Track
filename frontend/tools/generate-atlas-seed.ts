/**
 * Generates supabase/seed_atlas.sql from the curated dataset in
 * src/lib/atlas-data.ts, so the database and the demo data never drift apart
 * and nothing is transcribed by hand.
 *
 *   bun run seed:generate
 *
 * Metrics policy: this emits only numbers that are computed from the snapshot
 * itself (tier counts, quote coverage, contradiction count). Pipeline numbers
 * -- extraction rejection rate, audit precision, cluster stability -- are NOT
 * invented here; they require the extraction pipeline to exist. The methods
 * page says so rather than printing a made-up figure.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  clusters,
  diseases,
  edges,
  researchers,
  sources,
  type Asset,
  type Disease,
} from "../src/lib/atlas-data";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../supabase/seed_atlas.sql");

// ---------------------------------------------------------------- helpers
const q = (v: string | null | undefined): string =>
  v === null || v === undefined ? "null" : `'${v.replace(/'/g, "''")}'`;
const n = (v: number | null | undefined): string =>
  v === null || v === undefined ? "null" : String(v);
const b = (v: boolean): string => (v ? "true" : "false");
const arr = (v: string[]): string =>
  v.length === 0 ? "'{}'" : `array[${v.map(q).join(", ")}]::text[]`;

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const lines: string[] = [];
const say = (s = "") => lines.push(s);

/** Emits an idempotent multi-row insert. */
function insert(table: string, columns: string[], rows: string[][], conflict: string) {
  if (rows.length === 0) return;
  say(`insert into ${table} (${columns.join(", ")}) values`);
  say(rows.map((r) => `  (${r.join(", ")})`).join(",\n"));
  say(`on conflict ${conflict} do nothing;`);
  say();
}

// ---------------------------------------------------------------- header
say("-- Buffalo-Track: curated atlas snapshot.");
say("--");
say("-- GENERATED FILE -- do not edit by hand.");
say("--   cd frontend && bun run seed:generate");
say("--");
say("-- Source of truth: frontend/src/lib/atlas-data.ts");
say(`-- Rows: ${diseases.length} mechanism units, ${edges.length} edges.`);
say();

// ---------------------------------------------------------------- sources
insert(
  "atlas_sources",
  ["id", "name", "url", "pulled_at", "record_count"],
  sources.map((s) => [q(s.id), q(s.name), q(s.url), q(s.pulled), n(s.count)]),
  "(id)",
);

// ---------------------------------------------------------------- clusters
insert(
  "atlas_clusters",
  ["id", "name", "pathway", "color"],
  clusters.map((c) => [q(c.id), q(c.name), q(c.pathway), q(c.color)]),
  "(id)",
);

// ---------------------------------------------------------------- diseases
insert(
  "atlas_diseases",
  ["id", "name", "gene", "effect_class", "pathway", "cluster_id", "importance", "no_route"],
  diseases.map((d) => [
    q(d.id),
    q(d.name),
    q(d.gene),
    q(d.mechanism),
    q(d.pathway),
    q(d.cluster),
    n(d.importance),
    b(d.noRoute === true),
  ]),
  "(id)",
);

insert(
  "atlas_synonyms",
  ["disease_id", "synonym"],
  diseases.flatMap((d) => d.synonyms.map((s) => [q(d.id), q(s)])),
  "(disease_id, synonym)",
);

insert(
  "atlas_symptoms",
  ["disease_id", "symptom"],
  diseases.flatMap((d) => d.symptoms.map((s) => [q(d.id), q(s)])),
  "(disease_id, symptom)",
);

// Open questions are ordered, so a surrogate key plus position.
say("delete from atlas_open_questions;");
insert(
  "atlas_open_questions",
  ["disease_id", "question", "position"],
  diseases.flatMap((d) => d.openQuestions.map((x, i) => [q(d.id), q(x), n(i)])),
  "(id)",
);

// ---------------------------------------------------------------- organizations
type OrgRow = { id: string; name: string; url: string | null; source: string | null };
const orgs = new Map<string, OrgRow>();
const diseaseOrgs: string[][] = [];

for (const d of diseases) {
  if (!d.patientGroup) continue;
  const id = slug(d.patientGroup);
  const contact = d.contacts.find((c) => c.role === "patient group");
  if (!orgs.has(id)) {
    orgs.set(id, {
      id,
      name: d.patientGroup,
      url: contact?.url ?? null,
      source: contact?.source ? slug(contact.source) : null,
    });
  }
  diseaseOrgs.push([q(d.id), q(id), q(`Supports ${d.name} (${d.gene} ${d.mechanism})`)]);
}

// Source ids in the dataset are already slugs on atlas_sources; map by name too.
const sourceIds = new Set(sources.map((s) => s.id));
const resolveSource = (raw: string | null): string | null => {
  if (!raw) return null;
  if (sourceIds.has(raw)) return raw;
  const byName = sources.find((s) => slug(s.name) === slug(raw));
  return byName ? byName.id : null;
};

insert(
  "atlas_organizations",
  ["id", "name", "kind", "url", "source_id"],
  [...orgs.values()].map((o) => [
    q(o.id),
    q(o.name),
    q("patient group"),
    q(o.url),
    q(resolveSource(o.source)),
  ]),
  "(id)",
);

insert(
  "atlas_disease_organizations",
  ["disease_id", "organization_id", "relevance"],
  diseaseOrgs,
  "(disease_id, organization_id)",
);

// ---------------------------------------------------------------- assets
const assetId = (d: Disease, a: Asset, i: number) => `${d.id}-${slug(a.kind)}-${i}`;
insert(
  "atlas_assets",
  ["id", "disease_id", "kind", "name", "owner", "url", "reusable_because"],
  diseases.flatMap((d) =>
    d.assets.map((a, i) => [
      q(assetId(d, a, i)),
      q(d.id),
      q(a.kind),
      q(a.name),
      q(a.owner),
      q(a.url),
      q(`Built for ${d.name}; may transfer to units sharing ${d.pathway}`),
    ]),
  ),
  "(id)",
);

// ---------------------------------------------------------------- trials
// Synthesized from assets that describe a study. nct_id stays null: these are
// snapshot records, not matched registry entries.
const trialRows: string[][] = [];
const trialDiseaseRows: string[][] = [];
for (const d of diseases) {
  d.assets.forEach((a, i) => {
    if (a.kind !== "trial" && a.kind !== "natural history study") return;
    const id = assetId(d, a, i);
    trialRows.push([
      q(id),
      q(null),
      q(a.name),
      q("unknown"),
      q(a.kind === "trial" ? "interventional" : "observational"),
      q(a.owner),
      q(a.url),
    ]);
    trialDiseaseRows.push([q(id), q(d.id)]);
  });
}
insert(
  "atlas_trials",
  ["id", "nct_id", "name", "status", "study_type", "sponsor", "url"],
  trialRows,
  "(id)",
);
insert(
  "atlas_trial_diseases",
  ["trial_id", "disease_id"],
  trialDiseaseRows,
  "(trial_id, disease_id)",
);

// ---------------------------------------------------------------- contacts
say("delete from atlas_contacts;");
insert(
  "atlas_contacts",
  ["disease_id", "role", "name", "org", "source_id", "url"],
  diseases.flatMap((d) =>
    d.contacts.map((c) => [
      q(d.id),
      q(c.role),
      q(c.name),
      q(c.org),
      q(resolveSource(c.source)),
      q(c.url),
    ]),
  ),
  "(id)",
);

// ---------------------------------------------------------------- researchers
// No ORCIDs in the snapshot, so every person is flagged unresolved.
insert(
  "atlas_researchers",
  [
    "id",
    "name",
    "institution",
    "orcid",
    "unresolved",
    "pathway",
    "publications",
    "trials",
    "grants",
  ],
  researchers.map((r) => [
    q(slug(r.name)),
    q(r.name),
    q(r.institution),
    q(null),
    b(true),
    q(r.mechanism),
    n(r.papers.length),
    n(r.trials.length),
    n(0),
  ]),
  "(id)",
);

insert(
  "atlas_researcher_diseases",
  ["researcher_id", "disease_id", "basis"],
  researchers.flatMap((r) =>
    diseases.filter((d) => d.gene === r.gene).map((d) => [q(slug(r.name)), q(d.id), q("authored")]),
  ),
  "(researcher_id, disease_id, basis)",
);

// ---------------------------------------------------------------- edges
// quote_verified is false throughout: the quotes are hand-entered snapshot
// text, not yet checked verbatim against the source. The verifier in
// src/lib/quote-verify.ts is what flips this, per edge, once sources are pulled.
insert(
  "atlas_edges",
  [
    "id",
    "from_id",
    "to_id",
    "type",
    "tier",
    "sentence",
    "source_id",
    "quote",
    "retrieved_at",
    "confidence",
    "rule",
    "contradicting",
    "quote_verified",
    "method",
  ],
  edges.map((x) => [
    q(x.id),
    q(x.from),
    q(x.to),
    q(x.type),
    q(x.tier),
    q(x.sentence),
    q(x.source),
    q(x.quote ?? null),
    q(x.retrieved),
    n(x.confidence),
    q(x.rule),
    q(x.contradicting ?? null),
    b(false),
    q("curated snapshot"),
  ]),
  "(id)",
);

// ---------------------------------------------------------------- similarity
// Same formula the interface already used, now precomputed and stored with its
// components so the breakdown is auditable: 0.6 mechanism + 0.4 phenotype.
const simRows: string[][] = [];
for (const a of diseases) {
  for (const bD of diseases) {
    if (a.id === bD.id) continue;
    const mech =
      (a.pathway === bD.pathway ? 0.6 : 0.1) +
      (a.mechanism === bD.mechanism ? 0.3 : 0) +
      (a.cluster === bD.cluster ? 0.1 : 0);
    const sharedPhenos = a.symptoms.filter((s) => bD.symptoms.includes(s));
    const pheno = sharedPhenos.length / Math.max(a.symptoms.length, bD.symptoms.length);
    const mechanism = Math.min(1, mech);
    const combined = Math.min(1, 0.6 * mechanism + 0.4 * pheno);
    // Same gene, different effect class: the atlas must refuse to merge these.
    const blocked =
      a.gene === bD.gene && a.mechanism !== bD.mechanism
        ? `Same gene (${a.gene}) but different effect class: ${a.mechanism} vs ${bD.mechanism}. Mechanism units are never merged across effect classes.`
        : null;
    simRows.push([
      q(a.id),
      q(bD.id),
      n(Number(mechanism.toFixed(4))),
      n(Number(pheno.toFixed(4))),
      n(Number(combined.toFixed(4))),
      arr(a.pathway === bD.pathway ? [a.pathway] : []),
      arr(sharedPhenos),
      q(blocked),
    ]);
  }
}
insert(
  "atlas_similarity",
  [
    "a_id",
    "b_id",
    "mechanism_score",
    "phenotype_score",
    "combined_score",
    "shared_pathways",
    "shared_phenotypes",
    "blocked_reason",
  ],
  simRows,
  "(a_id, b_id)",
);

// ---------------------------------------------------------------- metrics
// Computed from this snapshot only. Nothing here is estimated.
const reported = edges.filter((x) => x.tier === "reported");
const withQuote = reported.filter((x) => (x.quote ?? "").length > 0);
const contradicted = edges.filter((x) => (x.contradicting ?? "").length > 0);
const metricRows: string[][] = [
  [
    q("quote_coverage"),
    q("Reported edges carrying a verbatim quote"),
    n(Number((withQuote.length / Math.max(1, reported.length)).toFixed(4))),
    q("ratio"),
    q(`${withQuote.length} of ${reported.length} reported edges`),
  ],
  [
    q("quote_verified"),
    q("Quotes checked verbatim against source text"),
    n(0),
    q("ratio"),
    q(
      "Requires the extraction pipeline; snapshot quotes are hand-entered and not yet machine-verified",
    ),
  ],
  [
    q("contradiction_coverage"),
    q("Edges recording contradicting evidence"),
    n(Number((contradicted.length / Math.max(1, edges.length)).toFixed(4))),
    q("ratio"),
    q(`${contradicted.length} of ${edges.length} edges`),
  ],
  [
    q("observed_share"),
    q("Share of edges at the observed tier"),
    n(
      Number(
        (edges.filter((x) => x.tier === "observed").length / Math.max(1, edges.length)).toFixed(4),
      ),
    ),
    q("ratio"),
    q("Structured database records rather than extracted claims"),
  ],
];
insert("atlas_metrics", ["key", "label", "value", "unit", "detail"], metricRows, "(key)");

writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`wrote ${OUT}`);
console.log(
  `  ${diseases.length} diseases, ${edges.length} edges, ${simRows.length} similarity pairs, ${orgs.size} organizations, ${trialRows.length} trials`,
);
