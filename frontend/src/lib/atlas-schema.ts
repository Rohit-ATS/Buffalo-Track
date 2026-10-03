/**
 * Shapes returned by the live atlas queries. Client-safe: no server imports.
 *
 * These deliberately mirror the curated types in atlas-data.ts so a view can
 * move from the snapshot to the database without changing its markup.
 */

export type Tier = "observed" | "reported" | "inferred";

export type EffectClass =
  "loss-of-function" | "gain-of-function" | "dominant-negative" | "repeat expansion" | "unknown";

export type MatchType = "disease" | "gene" | "synonym" | "symptom" | "patient group" | "mechanism";

/** One autocomplete / search hit. */
export type SearchMatch = {
  label: string;
  type: MatchType;
  diseaseId: string;
  diseaseName: string;
  /** The text that actually matched, when it differs from the canonical name. */
  alias: string | null;
};

/** Drives "You searched X, showing Y". */
export type Resolution = {
  typed: string;
  matchedOn: MatchType;
  alias: string | null;
  disease: DiseaseRef;
  synonyms: string[];
};

export type DiseaseRef = {
  id: string;
  name: string;
  gene: string;
  effectClass: EffectClass;
  pathway: string;
  clusterId: string | null;
  clusterName: string | null;
  mondoId: string | null;
  noRoute: boolean;
};

export type SourceRef = {
  id: string;
  name: string;
  url: string;
  pulledAt: string;
  recordCount: number;
};

/** A full receipt for one connection. */
export type EdgeReceipt = {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  type: string;
  tier: Tier;
  sentence: string;
  quote: string | null;
  quoteVerified: boolean;
  recordId: string | null;
  url: string | null;
  retrievedAt: string;
  confidence: number;
  rule: string;
  contradicting: string | null;
  method: string | null;
  source: SourceRef | null;
};

/** Similarity, never collapsed into one number. */
export type SimilarityBreakdown = {
  mechanism: number;
  phenotype: number;
  combined: number;
  sharedPathways: string[];
  sharedPhenotypes: string[];
  /** Set when two units share a gene but must not be merged. */
  blockedReason: string | null;
};

export type RelatedDisease = {
  disease: DiseaseRef;
  similarity: SimilarityBreakdown;
  /** The edges that justify the link, if any exist. */
  edges: EdgeReceipt[];
};

export type Organization = {
  id: string;
  name: string;
  kind: string;
  url: string | null;
  registryUrl: string | null;
  contactUrl: string | null;
  relevance: string | null;
};

export type AssetRecord = {
  id: string;
  kind: string;
  name: string;
  owner: string;
  url: string;
  reusableBecause: string | null;
};

export type TrialRecord = {
  id: string;
  nctId: string | null;
  name: string;
  status: string | null;
  studyType: string | null;
  intervention: string | null;
  sponsor: string | null;
  investigator: string | null;
  eligibility: string | null;
  startDate: string | null;
  url: string | null;
};

export type ContactRecord = {
  role: "patient group" | "lead investigator";
  name: string;
  org: string;
  url: string;
  sourceName: string | null;
};

export type ResearcherRecord = {
  id: string;
  name: string;
  institution: string | null;
  orcid: string | null;
  unresolved: boolean;
  pathway: string | null;
  publications: number;
  trials: number;
  grants: number;
  diseases: { id: string; name: string; basis: string }[];
};

/** A researcher or org touching more than one cluster. */
export type Bridge = {
  researcher: ResearcherRecord;
  clusters: { id: string; name: string }[];
};

/** Everything the journey view needs for one mechanism unit. */
export type Journey = {
  disease: DiseaseRef;
  synonyms: string[];
  symptoms: string[];
  openQuestions: string[];
  organizations: Organization[];
  assets: AssetRecord[];
  trials: TrialRecord[];
  contacts: ContactRecord[];
  related: RelatedDisease[];
  edges: EdgeReceipt[];
  /** Same gene, different effect class: the counterexample. */
  notConnected: RelatedDisease[];
};

/** The designed dead end. */
export type GapReport = {
  disease: DiseaseRef;
  searchedSources: SourceRef[];
  missing: string[];
  nearest: RelatedDisease[];
  whatWouldChangeIt: string[];
};

export type Coverage = {
  diseases: number;
  genes: number;
  mechanismUnits: number;
  phenotypes: number;
  connections: number;
  observedEdges: number;
  reportedEdges: number;
  inferredEdges: number;
  organizations: number;
  assets: number;
  trials: number;
  researchers: number;
  clusters: number;
  lastPulled: string | null;
};

export type Metric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  detail: string | null;
};

export type DuplicateEffort = {
  clusterId: string;
  clusterName: string | null;
  kind: string;
  assetCount: number;
  ownerCount: number;
  assetNames: string[];
  owners: string[];
};

/** Returned when the database is unreachable or unconfigured. */
export type AtlasUnavailable = { status: "unavailable"; reason: string };

export type AtlasResult<T> = ({ status: "ok" } & T) | AtlasUnavailable;
