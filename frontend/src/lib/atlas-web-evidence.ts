import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads what the discovery pipeline found.
 *
 * Everything here is `reported` evidence at best: a page said so, and the quote
 * verified. The shapes carry the fields that let a judge check that claim --
 * the source URL, the retrieval time, the verbatim quote, and the rule behind
 * the confidence -- because a discovered asset with no receipt is just a
 * rumour with better typography.
 */

export type WebSourceKind =
  | "patient organization"
  | "research institution"
  | "lab"
  | "registry"
  | "trial record"
  | "publication"
  | "government"
  | "reference"
  | "social"
  | "unknown";

export type WebSource = {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  kind: WebSourceKind;
  method: string;
  retrievedAt: string;
  contentChars: number;
};

/** A verified claim plus the page that proves it. */
export type WebEvidence = {
  id: string;
  subjectName: string;
  predicate: string;
  objectType: string;
  objectName: string;
  quote: string;
  confidence: number | null;
  rule: string | null;
  model: string | null;
  status: "pending" | "verified" | "rejected" | "failed";
  rejectReason: string | null;
  source: WebSource | null;
};

export type DiscoveredAsset = {
  id: string;
  kind: string;
  name: string;
  owner: string;
  url: string | null;
  eligibility: string | null;
  investigator: string | null;
  participants: number | null;
  reusableBecause: string | null;
  diseaseId: string | null;
  source: WebSource | null;
  evidence: WebEvidence | null;
};

export type DiscoveryRun = {
  id: string;
  seedTerm: string;
  startedAt: string;
  finishedAt: string | null;
  queriesRun: number;
  urlsFound: number;
  pagesFetched: number;
  claimsExtracted: number;
  claimsVerified: number;
  claimsRejected: number;
  notes: string | null;
};

/** The rejection rate the methods page needs, straight from the view. */
export type ExtractionQuality = {
  claimsTotal: number;
  verified: number;
  rejected: number;
  failed: number;
  /** Null when nothing has been checked -- never 0, which would read as perfect. */
  rejectionRate: number | null;
};

type SourceRow = {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  kind: WebSourceKind;
  method: string;
  retrieved_at: string;
  content_chars: number;
};

const SOURCE_SELECT = "id, url, domain, title, kind, method, retrieved_at, content_chars";

function toSource(row: SourceRow | null | undefined): WebSource | null {
  if (!row) return null;
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    kind: row.kind,
    method: row.method,
    retrievedAt: row.retrieved_at,
    contentChars: row.content_chars,
  };
}

function fail(message: string): never {
  throw new Error(message);
}

/** Assets discovered for one mechanism unit, newest first. */
export async function getDiscoveredAssets(
  db: SupabaseClient,
  diseaseId: string,
): Promise<DiscoveredAsset[]> {
  const { data, error } = await db
    .from("atlas_discovered_assets")
    .select(
      `id, kind, name, owner, url, eligibility, investigator, participants,
       reusable_because, disease_id, created_at,
       atlas_web_sources ( ${SOURCE_SELECT} ),
       atlas_web_claims ( id, subject_name, predicate, object_type, object_name,
                          quote, confidence, rule, model, status, reject_reason )`,
    )
    .eq("disease_id", diseaseId)
    .order("created_at", { ascending: false });

  if (error) fail(error.message);

  return (
    (data ?? []) as unknown as {
      id: string;
      kind: string;
      name: string;
      owner: string;
      url: string | null;
      eligibility: string | null;
      investigator: string | null;
      participants: number | null;
      reusable_because: string | null;
      disease_id: string | null;
      atlas_web_sources?: SourceRow | null;
      atlas_web_claims?: {
        id: string;
        subject_name: string;
        predicate: string;
        object_type: string;
        object_name: string;
        quote: string;
        confidence: number | null;
        rule: string | null;
        model: string | null;
        status: WebEvidence["status"];
        reject_reason: string | null;
      } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    owner: row.owner,
    url: row.url,
    eligibility: row.eligibility,
    investigator: row.investigator,
    participants: row.participants,
    reusableBecause: row.reusable_because,
    diseaseId: row.disease_id,
    source: toSource(row.atlas_web_sources),
    evidence: row.atlas_web_claims
      ? {
          id: row.atlas_web_claims.id,
          subjectName: row.atlas_web_claims.subject_name,
          predicate: row.atlas_web_claims.predicate,
          objectType: row.atlas_web_claims.object_type,
          objectName: row.atlas_web_claims.object_name,
          quote: row.atlas_web_claims.quote,
          confidence: row.atlas_web_claims.confidence,
          rule: row.atlas_web_claims.rule,
          model: row.atlas_web_claims.model,
          status: row.atlas_web_claims.status,
          rejectReason: row.atlas_web_claims.reject_reason,
          source: toSource(row.atlas_web_sources),
        }
      : null,
  }));
}

/** Verified claims for one page, for the "Verify on Web" drawer. */
export async function getWebEvidenceForSource(
  db: SupabaseClient,
  sourceId: string,
): Promise<WebEvidence[]> {
  const { data, error } = await db
    .from("atlas_web_claims")
    .select(
      `id, subject_name, predicate, object_type, object_name, quote, confidence,
       rule, model, status, reject_reason, atlas_web_sources ( ${SOURCE_SELECT} )`,
    )
    .eq("source_id", sourceId)
    .order("status");

  if (error) fail(error.message);

  return (
    (data ?? []) as unknown as {
      id: string;
      subject_name: string;
      predicate: string;
      object_type: string;
      object_name: string;
      quote: string;
      confidence: number | null;
      rule: string | null;
      model: string | null;
      status: WebEvidence["status"];
      reject_reason: string | null;
      atlas_web_sources?: SourceRow | null;
    }[]
  ).map((row) => ({
    id: row.id,
    subjectName: row.subject_name,
    predicate: row.predicate,
    objectType: row.object_type,
    objectName: row.object_name,
    quote: row.quote,
    confidence: row.confidence,
    rule: row.rule,
    model: row.model,
    status: row.status,
    rejectReason: row.reject_reason,
    source: toSource(row.atlas_web_sources),
  }));
}

export async function getExtractionQuality(db: SupabaseClient): Promise<ExtractionQuality> {
  const { data, error } = await db.from("atlas_extraction_quality").select("*").maybeSingle();
  if (error) fail(error.message);

  const row = (data ?? {}) as Record<string, number | string | null>;
  const num = (k: string): number => Number(row[k] ?? 0);
  const rate = row["rejection_rate"];
  return {
    claimsTotal: num("claims_total"),
    verified: num("verified"),
    rejected: num("rejected"),
    failed: num("failed"),
    rejectionRate: rate === null || rate === undefined ? null : Number(rate),
  };
}

export async function getRecentRuns(db: SupabaseClient, limit = 5): Promise<DiscoveryRun[]> {
  const { data, error } = await db
    .from("atlas_discovery_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) fail(error.message);

  return (
    (data ?? []) as unknown as {
      id: string;
      seed_term: string;
      started_at: string;
      finished_at: string | null;
      queries_run: number;
      urls_found: number;
      pages_fetched: number;
      claims_extracted: number;
      claims_verified: number;
      claims_rejected: number;
      notes: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    seedTerm: row.seed_term,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    queriesRun: row.queries_run,
    urlsFound: row.urls_found,
    pagesFetched: row.pages_fetched,
    claimsExtracted: row.claims_extracted,
    claimsVerified: row.claims_verified,
    claimsRejected: row.claims_rejected,
    notes: row.notes,
  }));
}

/** "Updated 3 hours ago" — rounded down, so it never overstates freshness. */
export function freshnessLabel(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const minutes = Math.floor((now.getTime() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
