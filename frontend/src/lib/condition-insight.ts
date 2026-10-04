import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * The learning half of the family network: what this condition does, and what
 * is being found out about it right now.
 *
 * Everything here is read straight from the atlas tables with the browser's
 * anon key. Migration 20261003000003_atlas.sql grants anon SELECT on the
 * reference tables precisely so a family can read them, and nothing in this
 * file touches a private table -- no profiles, no messages, no introductions.
 *
 * Nothing is invented. If a table is empty the view says so rather than
 * printing a plausible number, because a family reading "13 studies are
 * recruiting" has to be able to trust it.
 */

export type ConditionRef = {
  id: string;
  name: string;
  gene: string;
  pathway: string;
};

export type SymptomFact = {
  symptom: string;
  /** Share of described cases, 0-1, when the source recorded one. */
  frequency: number | null;
  /** Rarity across the atlas: higher means more specific to this condition. */
  infoContent: number | null;
};

export type TrialFact = {
  id: string;
  nctId: string | null;
  name: string;
  status: string;
  studyType: string | null;
  sponsor: string | null;
  investigator: string | null;
  startDate: string | null;
  url: string | null;
};

export type RelatedFact = {
  id: string;
  name: string;
  gene: string;
  /** Why the atlas links the two, taken from the edge's own sentence. */
  sentence: string;
  tier: string;
  quote: string | null;
  url: string | null;
};

export type ConditionInsight = {
  condition: ConditionRef;
  symptoms: SymptomFact[];
  openQuestions: string[];
  /** Recruiting and not-yet-recruiting first: the ones a family can still join. */
  trials: TrialFact[];
  related: RelatedFact[];
};

/** Statuses a family can still act on, in the order we show them. */
const OPEN_STATUSES = ["RECRUITING", "NOT_YET_RECRUITING", "ACTIVE_NOT_RECRUITING"];

export function isOpenTrial(status: string): boolean {
  return OPEN_STATUSES.includes(status.toUpperCase());
}

/** "NOT_YET_RECRUITING" is not a sentence. */
export function trialStatusLabel(status: string): string {
  const normalized = status.replace(/_/g, " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** Every condition in the atlas, for the picker. */
export async function listConditions(): Promise<ConditionRef[]> {
  const client = getSupabaseBrowser();
  if (!client) return [];

  const { data, error } = await client
    .from("atlas_diseases")
    .select("id, name, gene, pathway")
    .order("name");
  if (error || !data) return [];
  return data as ConditionRef[];
}

/**
 * Resolves a free-text profile condition ("STXBP1 Encephalopathy") to an atlas
 * record. Families type a gene far more often than a canonical disease name, so
 * the gene match is what usually lands; the id and name checks are there for
 * the cases where it does not.
 */
export function matchCondition(
  conditions: ConditionRef[],
  typed: string | null | undefined,
): ConditionRef | null {
  if (!typed) return null;
  const needle = typed.trim().toLowerCase();
  if (!needle) return null;

  const byId = conditions.find((c) => c.id.toLowerCase() === needle);
  if (byId) return byId;

  const byName = conditions.find((c) => c.name.toLowerCase() === needle);
  if (byName) return byName;

  // Longest gene first, so "STXBP1" is not shadowed by a shorter gene that
  // happens to be a substring of it.
  const byGene = [...conditions]
    .sort((a, b) => b.gene.length - a.gene.length)
    .find((c) => needle.includes(c.gene.toLowerCase()));
  if (byGene) return byGene;

  return conditions.find((c) => needle.includes(c.name.toLowerCase())) ?? null;
}

type SymptomRow = { symptom: string; frequency: number | null; info_content: number | null };
type QuestionRow = { question: string };
type TrialJoinRow = {
  atlas_trials: {
    id: string;
    nct_id: string | null;
    name: string;
    status: string | null;
    study_type: string | null;
    sponsor: string | null;
    investigator: string | null;
    start_date: string | null;
    url: string | null;
  } | null;
};
type EdgeRow = {
  from_id: string;
  to_id: string;
  sentence: string;
  tier: string;
  quote: string | null;
  url: string | null;
};
type DiseaseRow = ConditionRef;

/**
 * Loads everything the Learn and Discoveries tabs show for one condition, in
 * one round of parallel queries rather than a waterfall.
 */
export async function loadConditionInsight(
  condition: ConditionRef,
): Promise<ConditionInsight | null> {
  const client = getSupabaseBrowser();
  if (!client) return null;

  const [symptoms, questions, trials, edges] = await Promise.all([
    client
      .from("atlas_symptoms")
      .select("symptom, frequency, info_content")
      .eq("disease_id", condition.id),
    client
      .from("atlas_open_questions")
      .select("question")
      .eq("disease_id", condition.id)
      .order("position"),
    client
      .from("atlas_trial_diseases")
      .select(
        "atlas_trials ( id, nct_id, name, status, study_type, sponsor, investigator, start_date, url )",
      )
      .eq("disease_id", condition.id),
    client
      .from("atlas_edges")
      .select("from_id, to_id, sentence, tier, quote, url")
      .or(`from_id.eq.${condition.id},to_id.eq.${condition.id}`),
  ]);

  const symptomFacts = ((symptoms.data ?? []) as SymptomRow[])
    .map((row) => ({
      symptom: row.symptom,
      frequency: row.frequency,
      infoContent: row.info_content,
    }))
    // Most common first: a family scanning this wants "what should I expect"
    // before "what is unusual".
    .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0));

  const trialFacts = ((trials.data ?? []) as unknown as TrialJoinRow[])
    .map((row) => row.atlas_trials)
    .filter((t): t is NonNullable<TrialJoinRow["atlas_trials"]> => t !== null)
    .map((t) => ({
      id: t.id,
      nctId: t.nct_id,
      name: t.name,
      status: t.status ?? "unknown",
      studyType: t.study_type,
      sponsor: t.sponsor,
      investigator: t.investigator,
      startDate: t.start_date,
      url: t.url,
    }))
    .sort((a, b) => {
      const open = Number(isOpenTrial(b.status)) - Number(isOpenTrial(a.status));
      if (open !== 0) return open;
      return (b.startDate ?? "").localeCompare(a.startDate ?? "");
    });

  const edgeRows = (edges.data ?? []) as EdgeRow[];
  const otherIds = [
    ...new Set(edgeRows.map((e) => (e.from_id === condition.id ? e.to_id : e.from_id))),
  ];

  let related: RelatedFact[] = [];
  if (otherIds.length) {
    const { data: others } = await client
      .from("atlas_diseases")
      .select("id, name, gene, pathway")
      .in("id", otherIds);
    const byId = new Map((others ?? []).map((d) => [(d as DiseaseRow).id, d as DiseaseRow]));
    related = edgeRows
      .map((edge) => {
        const otherId = edge.from_id === condition.id ? edge.to_id : edge.from_id;
        const other = byId.get(otherId);
        if (!other) return null;
        return {
          id: other.id,
          name: other.name,
          gene: other.gene,
          sentence: edge.sentence,
          tier: edge.tier,
          quote: edge.quote,
          url: edge.url,
        };
      })
      .filter((r): r is RelatedFact => r !== null);
  }

  return {
    condition,
    symptoms: symptomFacts,
    openQuestions: ((questions.data ?? []) as QuestionRow[]).map((q) => q.question),
    trials: trialFacts,
    related,
  };
}
