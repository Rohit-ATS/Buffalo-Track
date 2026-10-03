import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeQuery } from "@/lib/atlas";
import type {
  AssetRecord,
  Bridge,
  ContactRecord,
  Coverage,
  DiseaseRef,
  DuplicateEffort,
  EdgeReceipt,
  GapReport,
  Journey,
  Metric,
  Organization,
  RelatedDisease,
  ResearcherRecord,
  Resolution,
  SearchMatch,
  SimilarityBreakdown,
  SourceRef,
  TrialRecord,
} from "@/lib/atlas-schema";

/**
 * Live atlas queries against Supabase.
 *
 * Every function takes its client as an argument — no env reads here — so the
 * whole layer is testable against a fake client, and a caller decides whether
 * to use the service-role client or an anon one.
 */

const DISEASE_SELECT = `
  id, name, gene, effect_class, pathway, cluster_id, mondo_id, no_route,
  atlas_clusters ( id, name )
`;

const EDGE_SELECT = `
  id, from_id, to_id, type, tier, sentence, quote, quote_verified, record_id, url,
  retrieved_at, confidence, rule, contradicting, method,
  atlas_sources ( id, name, url, pulled_at, record_count ),
  from_disease:atlas_diseases!atlas_edges_from_id_fkey ( id, name ),
  to_disease:atlas_diseases!atlas_edges_to_id_fkey ( id, name )
`;

type DiseaseRow = {
  id: string;
  name: string;
  gene: string;
  effect_class: DiseaseRef["effectClass"];
  pathway: string;
  cluster_id: string | null;
  mondo_id: string | null;
  no_route: boolean;
  atlas_clusters?: { id: string; name: string } | null;
};

type EdgeRow = {
  id: string;
  from_id: string;
  to_id: string;
  type: string;
  tier: EdgeReceipt["tier"];
  sentence: string;
  quote: string | null;
  quote_verified: boolean;
  record_id: string | null;
  url: string | null;
  retrieved_at: string;
  confidence: number;
  rule: string;
  contradicting: string | null;
  method: string | null;
  atlas_sources?: SourceRowShape | null;
  from_disease?: { id: string; name: string } | null;
  to_disease?: { id: string; name: string } | null;
};

type SourceRowShape = {
  id: string;
  name: string;
  url: string;
  pulled_at: string;
  record_count: number;
};

type SimilarityRow = {
  a_id: string;
  b_id: string;
  mechanism_score: number;
  phenotype_score: number;
  combined_score: number;
  shared_pathways: string[] | null;
  shared_phenotypes: string[] | null;
  blocked_reason: string | null;
};

// ---------------------------------------------------------------- mappers
function toDisease(row: DiseaseRow): DiseaseRef {
  return {
    id: row.id,
    name: row.name,
    gene: row.gene,
    effectClass: row.effect_class,
    pathway: row.pathway,
    clusterId: row.cluster_id,
    clusterName: row.atlas_clusters?.name ?? null,
    mondoId: row.mondo_id,
    noRoute: row.no_route,
  };
}

function toSource(row: SourceRowShape | null | undefined): SourceRef | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    pulledAt: row.pulled_at,
    recordCount: row.record_count,
  };
}

function toEdge(row: EdgeRow): EdgeReceipt {
  return {
    id: row.id,
    fromId: row.from_id,
    fromName: row.from_disease?.name ?? row.from_id,
    toId: row.to_id,
    toName: row.to_disease?.name ?? row.to_id,
    type: row.type,
    tier: row.tier,
    sentence: row.sentence,
    quote: row.quote,
    quoteVerified: row.quote_verified,
    recordId: row.record_id,
    url: row.url,
    retrievedAt: row.retrieved_at,
    confidence: row.confidence,
    rule: row.rule,
    contradicting: row.contradicting,
    method: row.method,
    source: toSource(row.atlas_sources),
  };
}

function toSimilarity(row: SimilarityRow): SimilarityBreakdown {
  return {
    mechanism: row.mechanism_score,
    phenotype: row.phenotype_score,
    combined: row.combined_score,
    sharedPathways: row.shared_pathways ?? [],
    sharedPhenotypes: row.shared_phenotypes ?? [],
    blockedReason: row.blocked_reason,
  };
}

function fail(message: string): never {
  throw new Error(message);
}

// ---------------------------------------------------------------- search
const MATCH_LIMIT = 8;

/**
 * Universal search: disease name, synonym, gene, symptom, organization, or
 * mechanism/pathway. Runs the lookups in parallel and ranks exact hits first.
 */
export async function searchAtlas(db: SupabaseClient, rawQuery: string): Promise<SearchMatch[]> {
  const term = sanitizeQuery(rawQuery);
  if (!term) return [];
  const like = `%${term}%`;

  const [byName, bySynonym, bySymptom, byOrg] = await Promise.all([
    db
      .from("atlas_diseases")
      .select("id, name, gene, pathway, effect_class")
      .or(`name.ilike.${like},gene.ilike.${like},pathway.ilike.${like}`)
      .limit(MATCH_LIMIT * 2),
    db
      .from("atlas_synonyms")
      .select("disease_id, synonym, atlas_diseases ( id, name )")
      .ilike("synonym", like)
      .limit(MATCH_LIMIT),
    db
      .from("atlas_symptoms")
      .select("disease_id, symptom, atlas_diseases ( id, name )")
      .ilike("symptom", like)
      .limit(MATCH_LIMIT),
    db
      .from("atlas_disease_organizations")
      .select("disease_id, atlas_organizations ( id, name ), atlas_diseases ( id, name )")
      .limit(50),
  ]);

  if (byName.error) fail(byName.error.message);
  if (bySynonym.error) fail(bySynonym.error.message);
  if (bySymptom.error) fail(bySymptom.error.message);
  if (byOrg.error) fail(byOrg.error.message);

  const lower = term.toLowerCase();
  const out: SearchMatch[] = [];

  for (const d of (byName.data ?? []) as unknown as {
    id: string;
    name: string;
    gene: string;
    pathway: string;
  }[]) {
    if (d.name.toLowerCase().includes(lower)) {
      out.push({
        label: d.name,
        type: "disease",
        diseaseId: d.id,
        diseaseName: d.name,
        alias: null,
      });
    }
    if (d.gene.toLowerCase().includes(lower)) {
      out.push({
        label: `${d.gene} — ${d.name}`,
        type: "gene",
        diseaseId: d.id,
        diseaseName: d.name,
        alias: d.gene,
      });
    }
    if (d.pathway.toLowerCase().includes(lower)) {
      out.push({
        label: `${d.pathway} — ${d.name}`,
        type: "mechanism",
        diseaseId: d.id,
        diseaseName: d.name,
        alias: d.pathway,
      });
    }
  }

  for (const s of (bySynonym.data ?? []) as unknown as {
    disease_id: string;
    synonym: string;
    atlas_diseases?: { name: string } | null;
  }[]) {
    out.push({
      label: s.synonym,
      type: "synonym",
      diseaseId: s.disease_id,
      diseaseName: s.atlas_diseases?.name ?? s.disease_id,
      alias: s.synonym,
    });
  }

  for (const s of (bySymptom.data ?? []) as unknown as {
    disease_id: string;
    symptom: string;
    atlas_diseases?: { name: string } | null;
  }[]) {
    out.push({
      label: `${s.symptom} — ${s.atlas_diseases?.name ?? s.disease_id}`,
      type: "symptom",
      diseaseId: s.disease_id,
      diseaseName: s.atlas_diseases?.name ?? s.disease_id,
      alias: s.symptom,
    });
  }

  for (const o of (byOrg.data ?? []) as unknown as {
    disease_id: string;
    atlas_organizations?: { name: string } | null;
    atlas_diseases?: { name: string } | null;
  }[]) {
    const name = o.atlas_organizations?.name;
    if (!name || !name.toLowerCase().includes(lower)) continue;
    out.push({
      label: name,
      type: "patient group",
      diseaseId: o.disease_id,
      diseaseName: o.atlas_diseases?.name ?? o.disease_id,
      alias: name,
    });
  }

  // Exact matches first, then prefix, then the rest. Dedupe by label.
  const rank = (m: SearchMatch): number => {
    const hay = (m.alias ?? m.label).toLowerCase();
    if (hay === lower) return 0;
    if (hay.startsWith(lower)) return 1;
    return 2;
  };
  const seen = new Set<string>();
  return out
    .filter((m) => (seen.has(m.label) ? false : (seen.add(m.label), true)))
    .sort((a, bM) => rank(a) - rank(bM))
    .slice(0, MATCH_LIMIT);
}

/** Resolves a typed string to one canonical unit, for "You searched X, showing Y". */
export async function resolveQuery(
  db: SupabaseClient,
  rawQuery: string,
): Promise<Resolution | null> {
  const matches = await searchAtlas(db, rawQuery);
  const best = matches[0];
  if (!best) return null;

  const [disease, synonyms] = await Promise.all([
    getDisease(db, best.diseaseId),
    getSynonyms(db, best.diseaseId),
  ]);
  if (!disease) return null;

  return {
    typed: sanitizeQuery(rawQuery),
    matchedOn: best.type,
    alias: best.alias,
    disease,
    synonyms,
  };
}

// ---------------------------------------------------------------- disease
export async function getDisease(db: SupabaseClient, id: string): Promise<DiseaseRef | null> {
  const { data, error } = await db
    .from("atlas_diseases")
    .select(DISEASE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error.message);
  return data ? toDisease(data as unknown as DiseaseRow) : null;
}

async function getSynonyms(db: SupabaseClient, id: string): Promise<string[]> {
  const { data, error } = await db.from("atlas_synonyms").select("synonym").eq("disease_id", id);
  if (error) fail(error.message);
  return ((data ?? []) as unknown as { synonym: string }[]).map((r) => r.synonym);
}

// ---------------------------------------------------------------- edges
export async function getEdgesFor(db: SupabaseClient, id: string): Promise<EdgeReceipt[]> {
  const { data, error } = await db
    .from("atlas_edges")
    .select(EDGE_SELECT)
    .or(`from_id.eq.${id},to_id.eq.${id}`)
    .order("confidence", { ascending: false });
  if (error) fail(error.message);
  return ((data ?? []) as unknown as EdgeRow[]).map(toEdge);
}

export async function getEdge(db: SupabaseClient, edgeId: string): Promise<EdgeReceipt | null> {
  const { data, error } = await db
    .from("atlas_edges")
    .select(EDGE_SELECT)
    .eq("id", edgeId)
    .maybeSingle();
  if (error) fail(error.message);
  return data ? toEdge(data as unknown as EdgeRow) : null;
}

// ---------------------------------------------------------------- related
/**
 * Related units, ranked by the combined score. `blockedReason` rows are
 * excluded here and surfaced separately as the counterexample.
 */
export async function getRelated(
  db: SupabaseClient,
  id: string,
  options: { includeBlocked?: boolean; limit?: number } = {},
): Promise<RelatedDisease[]> {
  const { data, error } = await db
    .from("atlas_similarity")
    .select("*")
    .eq("a_id", id)
    .order("combined_score", { ascending: false });
  if (error) fail(error.message);

  const rows = ((data ?? []) as unknown as SimilarityRow[]).filter((r) =>
    options.includeBlocked === true ? r.blocked_reason !== null : r.blocked_reason === null,
  );
  const limited = options.limit === undefined ? rows : rows.slice(0, options.limit);
  if (limited.length === 0) return [];

  const ids = limited.map((r) => r.b_id);
  const [diseasesResult, edges] = await Promise.all([
    db.from("atlas_diseases").select(DISEASE_SELECT).in("id", ids),
    getEdgesFor(db, id),
  ]);
  if (diseasesResult.error) fail(diseasesResult.error.message);

  const byId = new Map<string, DiseaseRef>(
    ((diseasesResult.data ?? []) as unknown as DiseaseRow[]).map((r) => [r.id, toDisease(r)]),
  );

  const out: RelatedDisease[] = [];
  for (const row of limited) {
    const disease = byId.get(row.b_id);
    if (!disease) continue;
    out.push({
      disease,
      similarity: toSimilarity(row),
      edges: edges.filter(
        (e) => (e.fromId === id && e.toId === row.b_id) || (e.toId === id && e.fromId === row.b_id),
      ),
    });
  }
  return out;
}

/** Same gene, different effect class. The atlas refuses to merge these. */
export async function getNotConnected(db: SupabaseClient, id: string): Promise<RelatedDisease[]> {
  return getRelated(db, id, { includeBlocked: true });
}

// ---------------------------------------------------------------- journey
export async function getJourney(db: SupabaseClient, id: string): Promise<Journey | null> {
  const disease = await getDisease(db, id);
  if (!disease) return null;

  const [
    synonyms,
    symptoms,
    questions,
    orgs,
    assets,
    trials,
    contacts,
    related,
    notConnected,
    edges,
  ] = await Promise.all([
    getSynonyms(db, id),
    db.from("atlas_symptoms").select("symptom").eq("disease_id", id),
    db.from("atlas_open_questions").select("question").eq("disease_id", id).order("position"),
    db
      .from("atlas_disease_organizations")
      .select("relevance, atlas_organizations ( id, name, kind, url, registry_url, contact_url )")
      .eq("disease_id", id),
    db
      .from("atlas_assets")
      .select("id, kind, name, owner, url, reusable_because")
      .eq("disease_id", id),
    db
      .from("atlas_trial_diseases")
      .select(
        "atlas_trials ( id, nct_id, name, status, study_type, intervention, sponsor, investigator, eligibility, start_date, url )",
      )
      .eq("disease_id", id),
    db
      .from("atlas_contacts")
      .select("role, name, org, url, atlas_sources ( name )")
      .eq("disease_id", id),
    getRelated(db, id, { limit: 6 }),
    getNotConnected(db, id),
    getEdgesFor(db, id),
  ]);

  for (const r of [symptoms, questions, orgs, assets, trials, contacts]) {
    if (r.error) fail(r.error.message);
  }

  return {
    disease,
    synonyms,
    symptoms: ((symptoms.data ?? []) as unknown as { symptom: string }[]).map((r) => r.symptom),
    openQuestions: ((questions.data ?? []) as unknown as { question: string }[]).map(
      (r) => r.question,
    ),
    organizations: (
      (orgs.data ?? []) as unknown as {
        relevance: string | null;
        atlas_organizations?: {
          id: string;
          name: string;
          kind: string;
          url: string | null;
          registry_url: string | null;
          contact_url: string | null;
        } | null;
      }[]
    ).flatMap<Organization>((r) =>
      r.atlas_organizations
        ? [
            {
              id: r.atlas_organizations.id,
              name: r.atlas_organizations.name,
              kind: r.atlas_organizations.kind,
              url: r.atlas_organizations.url,
              registryUrl: r.atlas_organizations.registry_url,
              contactUrl: r.atlas_organizations.contact_url,
              relevance: r.relevance,
            },
          ]
        : [],
    ),
    assets: (
      (assets.data ?? []) as unknown as {
        id: string;
        kind: string;
        name: string;
        owner: string;
        url: string;
        reusable_because: string | null;
      }[]
    ).map<AssetRecord>((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      owner: r.owner,
      url: r.url,
      reusableBecause: r.reusable_because,
    })),
    trials: (
      (trials.data ?? []) as unknown as {
        atlas_trials?: {
          id: string;
          nct_id: string | null;
          name: string;
          status: string | null;
          study_type: string | null;
          intervention: string | null;
          sponsor: string | null;
          investigator: string | null;
          eligibility: string | null;
          start_date: string | null;
          url: string | null;
        } | null;
      }[]
    ).flatMap<TrialRecord>((r) =>
      r.atlas_trials
        ? [
            {
              id: r.atlas_trials.id,
              nctId: r.atlas_trials.nct_id,
              name: r.atlas_trials.name,
              status: r.atlas_trials.status,
              studyType: r.atlas_trials.study_type,
              intervention: r.atlas_trials.intervention,
              sponsor: r.atlas_trials.sponsor,
              investigator: r.atlas_trials.investigator,
              eligibility: r.atlas_trials.eligibility,
              startDate: r.atlas_trials.start_date,
              url: r.atlas_trials.url,
            },
          ]
        : [],
    ),
    contacts: (
      (contacts.data ?? []) as unknown as {
        role: ContactRecord["role"];
        name: string;
        org: string;
        url: string;
        atlas_sources?: { name: string } | null;
      }[]
    ).map<ContactRecord>((r) => ({
      role: r.role,
      name: r.name,
      org: r.org,
      url: r.url,
      sourceName: r.atlas_sources?.name ?? null,
    })),
    related,
    notConnected,
    edges,
  };
}

// ---------------------------------------------------------------- gap state
/** The designed dead end: what was searched, what is missing, what would change it. */
export async function getGapReport(db: SupabaseClient, id: string): Promise<GapReport | null> {
  const disease = await getDisease(db, id);
  if (!disease) return null;

  const [sources, orgs, assets, nearest] = await Promise.all([
    db.from("atlas_sources").select("*").order("name"),
    db.from("atlas_disease_organizations").select("disease_id").eq("disease_id", id),
    db.from("atlas_assets").select("id").eq("disease_id", id),
    getRelated(db, id, { limit: 3 }),
  ]);
  if (sources.error) fail(sources.error.message);
  if (orgs.error) fail(orgs.error.message);
  if (assets.error) fail(assets.error.message);

  const missing: string[] = [];
  if ((orgs.data ?? []).length === 0)
    missing.push("No patient organization found for this exact diagnosis");
  if ((assets.data ?? []).length === 0)
    missing.push("No registry or natural history study recorded");
  if (disease.noRoute) missing.push("No supported route to an existing community");

  return {
    disease,
    searchedSources: ((sources.data ?? []) as unknown as SourceRowShape[]).flatMap((r) => {
      const s = toSource(r);
      return s ? [s] : [];
    }),
    missing,
    nearest,
    whatWouldChangeIt: [
      "A published cohort describing two or more patients with this effect class",
      "A registry or natural history study listing this unit in its eligibility criteria",
      "A patient organization naming this diagnosis on its own site",
      "A trial enrolling this unit alongside a neighbouring one",
    ],
  };
}

// ---------------------------------------------------------------- coverage
export async function getCoverage(db: SupabaseClient): Promise<Coverage> {
  const { data, error } = await db.from("atlas_coverage").select("*").maybeSingle();
  if (error) fail(error.message);
  const row = (data ?? {}) as Record<string, number | string | null>;
  const num = (k: string): number => Number(row[k] ?? 0);
  return {
    diseases: num("diseases"),
    genes: num("genes"),
    mechanismUnits: num("mechanism_units"),
    phenotypes: num("phenotypes"),
    connections: num("connections"),
    observedEdges: num("observed_edges"),
    reportedEdges: num("reported_edges"),
    inferredEdges: num("inferred_edges"),
    organizations: num("organizations"),
    assets: num("assets"),
    trials: num("trials"),
    researchers: num("researchers"),
    clusters: num("clusters"),
    lastPulled: (row["last_pulled"] as string | null) ?? null,
  };
}

export async function getMetrics(db: SupabaseClient): Promise<Metric[]> {
  const { data, error } = await db.from("atlas_metrics").select("*").order("key");
  if (error) fail(error.message);
  return (
    (data ?? []) as unknown as {
      key: string;
      label: string;
      value: number | string;
      unit: string;
      detail: string | null;
    }[]
  ).map((r) => ({
    key: r.key,
    label: r.label,
    value: Number(r.value),
    unit: r.unit,
    detail: r.detail,
  }));
}

export async function getSources(db: SupabaseClient): Promise<SourceRef[]> {
  const { data, error } = await db.from("atlas_sources").select("*").order("name");
  if (error) fail(error.message);
  return ((data ?? []) as unknown as SourceRowShape[]).flatMap((r) => {
    const s = toSource(r);
    return s ? [s] : [];
  });
}

// ---------------------------------------------------------------- researchers
export async function getResearchers(db: SupabaseClient): Promise<ResearcherRecord[]> {
  const { data, error } = await db
    .from("atlas_researchers")
    .select(
      "id, name, institution, orcid, unresolved, pathway, publications, trials, grants, atlas_researcher_diseases ( basis, atlas_diseases ( id, name ) )",
    )
    .order("name");
  if (error) fail(error.message);

  return (
    (data ?? []) as unknown as {
      id: string;
      name: string;
      institution: string | null;
      orcid: string | null;
      unresolved: boolean;
      pathway: string | null;
      publications: number;
      trials: number;
      grants: number;
      atlas_researcher_diseases?: {
        basis: string;
        atlas_diseases?: { id: string; name: string } | null;
      }[];
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    institution: r.institution,
    orcid: r.orcid,
    unresolved: r.unresolved,
    pathway: r.pathway,
    publications: r.publications,
    trials: r.trials,
    grants: r.grants,
    diseases: (r.atlas_researcher_diseases ?? []).flatMap((l) =>
      l.atlas_diseases
        ? [{ id: l.atlas_diseases.id, name: l.atlas_diseases.name, basis: l.basis }]
        : [],
    ),
  }));
}

/** A person touching two or more clusters is a bridge between communities. */
export async function getBridges(db: SupabaseClient): Promise<Bridge[]> {
  const [researchers, diseasesResult] = await Promise.all([
    getResearchers(db),
    db.from("atlas_diseases").select(DISEASE_SELECT),
  ]);
  if (diseasesResult.error) fail(diseasesResult.error.message);

  const clusterOf = new Map<string, { id: string; name: string }>();
  for (const row of (diseasesResult.data ?? []) as unknown as DiseaseRow[]) {
    if (row.cluster_id) {
      clusterOf.set(row.id, {
        id: row.cluster_id,
        name: row.atlas_clusters?.name ?? row.cluster_id,
      });
    }
  }

  const out: Bridge[] = [];
  for (const r of researchers) {
    const clusters = new Map<string, { id: string; name: string }>();
    for (const d of r.diseases) {
      const c = clusterOf.get(d.id);
      if (c) clusters.set(c.id, c);
    }
    if (clusters.size > 1) out.push({ researcher: r, clusters: [...clusters.values()] });
  }
  return out;
}

// ---------------------------------------------------------------- duplicate effort
export async function getDuplicateEffort(db: SupabaseClient): Promise<DuplicateEffort[]> {
  const [dupes, clusters] = await Promise.all([
    db.from("atlas_duplicate_effort").select("*"),
    db.from("atlas_clusters").select("id, name"),
  ]);
  if (dupes.error) fail(dupes.error.message);
  if (clusters.error) fail(clusters.error.message);

  const names = new Map<string, string>(
    ((clusters.data ?? []) as unknown as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  return (
    (dupes.data ?? []) as unknown as {
      cluster_id: string;
      kind: string;
      asset_count: number;
      owner_count: number;
      asset_names: string[] | null;
      owners: string[] | null;
    }[]
  ).map((r) => ({
    clusterId: r.cluster_id,
    clusterName: names.get(r.cluster_id) ?? null,
    kind: r.kind,
    assetCount: Number(r.asset_count),
    ownerCount: Number(r.owner_count),
    assetNames: r.asset_names ?? [],
    owners: r.owners ?? [],
  }));
}

// ---------------------------------------------------------------- mechanism search
/** Priya's view: pick an effect class and/or pathway, get ranked units. */
export async function searchByMechanism(
  db: SupabaseClient,
  filters: { effectClass?: string | undefined; pathway?: string | undefined },
): Promise<DiseaseRef[]> {
  let query = db.from("atlas_diseases").select(DISEASE_SELECT);
  if (filters.effectClass) query = query.eq("effect_class", filters.effectClass);
  if (filters.pathway) query = query.ilike("pathway", `%${sanitizeQuery(filters.pathway)}%`);

  const { data, error } = await query.order("importance", { ascending: false });
  if (error) fail(error.message);
  return ((data ?? []) as unknown as DiseaseRow[]).map(toDisease);
}

export async function listDiseases(db: SupabaseClient): Promise<DiseaseRef[]> {
  const { data, error } = await db
    .from("atlas_diseases")
    .select(DISEASE_SELECT)
    .order("importance", { ascending: false });
  if (error) fail(error.message);
  return ((data ?? []) as unknown as DiseaseRow[]).map(toDisease);
}
