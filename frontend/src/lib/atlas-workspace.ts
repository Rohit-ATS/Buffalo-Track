// Extra sample data for the dashboard research workspace. All values are demo data.
import { diseases, diseaseById, edges, other, sources, type Edge, type Tier } from "./atlas-data";

export interface Resolution { mondo: string; omim: string; orphanet: string; gard: string; extraSynonyms: string[]; phenotypes: string[]; process: string }
export const resolution: Record<string, Resolution> = {
  stxbp1: { mondo: "MONDO:0013305", omim: "612164", orphanet: "ORPHA:1934", gard: "GARD:10506", extraSynonyms: ["Ohtahara syndrome (STXBP1)", "Early infantile epileptic encephalopathy 4", "EIEE4"], phenotypes: ["HP:0001250 Seizure", "HP:0001263 Global developmental delay", "HP:0001337 Tremor"], process: "Synaptic vesicle priming" },
  stx1b: { mondo: "MONDO:0014483", omim: "616172", orphanet: "ORPHA:439167", gard: "GARD:12895", extraSynonyms: ["GEFS+ type 9"], phenotypes: ["HP:0002373 Febrile seizure", "HP:0001250 Seizure"], process: "SNARE complex assembly" },
  snap25: { mondo: "MONDO:0014931", omim: "616330", orphanet: "ORPHA:353327", gard: "GARD:13104", extraSynonyms: ["Congenital myasthenic syndrome 18"], phenotypes: ["HP:0001249 Intellectual disability", "HP:0001251 Ataxia"], process: "SNARE complex assembly" },
  syt1: { mondo: "MONDO:0032756", omim: "618218", orphanet: "ORPHA:528084", gard: "GARD:15920", extraSynonyms: ["SYT1 neurodevelopmental disorder"], phenotypes: ["HP:0100022 Abnormality of movement"], process: "Calcium-triggered exocytosis" },
  scn2a: { mondo: "MONDO:0014375", omim: "613721", orphanet: "ORPHA:1934", gard: "GARD:12406", extraSynonyms: ["DEE11", "EIEE11"], phenotypes: ["HP:0000729 Autistic behavior", "HP:0001250 Seizure"], process: "Action potential initiation" },
  kcnq2: { mondo: "MONDO:0013384", omim: "613720", orphanet: "ORPHA:439218", gard: "GARD:12405", extraSynonyms: ["DEE7", "EIEE7"], phenotypes: ["HP:0032792 Neonatal seizure"], process: "M-current repolarization" },
  "cacna1a-ea2": { mondo: "MONDO:0008251", omim: "108500", orphanet: "ORPHA:37612", gard: "GARD:2172", extraSynonyms: ["Acetazolamide-responsive ataxia"], phenotypes: ["HP:0002131 Episodic ataxia", "HP:0000639 Nystagmus"], process: "P/Q-type calcium influx (reduced)" },
  "cacna1a-fhm1": { mondo: "MONDO:0007948", omim: "141500", orphanet: "ORPHA:569", gard: "GARD:6555", extraSynonyms: ["Hemiplegic migraine type 1"], phenotypes: ["HP:0002076 Migraine", "HP:0001251 Ataxia"], process: "P/Q-type calcium influx (increased)" },
  vamp2: { mondo: "MONDO:0032668", omim: "618760", orphanet: "—", gard: "—", extraSynonyms: ["NEDHAHM"], phenotypes: ["HP:0001252 Hypotonia"], process: "SNARE complex assembly" },
};

export interface Trial { id: string; diseaseId: string; title: string; phase: string; status: "Recruiting" | "Active" | "Completed" | "Planned"; sites: number; eligibility: string }
export const trials: Trial[] = [
  { id: "NCT-DEMO-01", diseaseId: "stxbp1", title: "STXBP1 natural history and outcome measures", phase: "Observational", status: "Recruiting", sites: 9, eligibility: "Age 0–40, confirmed STXBP1 variant" },
  { id: "NCT-DEMO-02", diseaseId: "stxbp1", title: "Chemical chaperone pilot (4-phenylbutyrate)", phase: "Phase 1/2", status: "Active", sites: 3, eligibility: "Age 2–18, loss-of-function variant" },
  { id: "NCT-DEMO-03", diseaseId: "snap25", title: "SNARE disorders natural history pilot", phase: "Observational", status: "Planned", sites: 2, eligibility: "SNAP25, STX1B or SYT1 variant" },
  { id: "NCT-DEMO-04", diseaseId: "scn2a", title: "Antisense oligonucleotide for SCN2A gain of function", phase: "Phase 1/2", status: "Recruiting", sites: 6, eligibility: "Early-onset gain-of-function variant" },
  { id: "NCT-DEMO-05", diseaseId: "kcnq2", title: "Potassium channel opener in KCNQ2 encephalopathy", phase: "Phase 2", status: "Completed", sites: 11, eligibility: "Age 1 month–4 years" },
  { id: "NCT-DEMO-06", diseaseId: "cacna1a-ea2", title: "4-aminopyridine for episodic ataxia type 2", phase: "Phase 3", status: "Completed", sites: 4, eligibility: "EA2 with ≥2 attacks per month" },
];

// The exact passage each quote was checked against.
export const passages: Record<string, { passage: string; result: "Verified" | "Paraphrased" | "Not found" }> = {
  e1: { passage: "…in neurons, Munc18-1 binds syntaxin-1 to orchestrate SNARE complex assembly and is essential for neurotransmitter release.", result: "Verified" },
  e2: { passage: "…SNAP25 and syntaxin-1, together with synaptobrevin, form the core of the neuronal SNARE complex.", result: "Verified" },
  e3: { passage: "Phenotype annotations show shared early-onset seizures and developmental delay in both disorders.", result: "Paraphrased" },
  e4: { passage: "No sentence in the source directly links SYT1 and SNAP25 patient cohorts.", result: "Not found" },
  e5: { passage: "No direct source sentence; connection proposed from overlapping study designs.", result: "Not found" },
  e6: { passage: "…both SCN2A and KCNQ2 encode voltage-gated channels that set neuronal excitability.", result: "Verified" },
  e7: { passage: "…loss-of-function CACNA1A variants cause EA2 whereas gain-of-function variants cause FHM1.", result: "Verified" },
  e8: { passage: "VAMP2 is the vesicle SNARE; patient-level overlap with STX1B is not yet described.", result: "Not found" },
};

export const provenance = (edge: Edge) => ({
  source: sources.find((s) => s.id === edge.source)!.name,
  retrieved: edge.retrieved,
  method: edge.tier === "observed" ? "Curated from experimental paper" : edge.tier === "reported" ? "Imported from curated database" : "Pathway-proximity model",
  version: "atlas-sample v0.4",
});

/** Gene + effect class is the real mechanism unit. */
export const mechanismUnits = () => {
  const map = new Map<string, { gene: string; effect: string; pathway: string; process: string; diseases: string[]; phenotypes: string[] }>();
  for (const d of diseases) {
    const key = `${d.gene}|${d.mechanism}`;
    const cur = map.get(key) ?? { gene: d.gene, effect: d.mechanism, pathway: d.pathway, process: resolution[d.id]?.process ?? "", diseases: [], phenotypes: [] };
    cur.diseases.push(d.id);
    cur.phenotypes = [...new Set([...cur.phenotypes, ...d.symptoms])];
    map.set(key, cur);
  }
  return [...map.values()];
};

export function breakdown(aId: string, bId: string) {
  const x = diseaseById(aId)!, y = diseaseById(bId)!;
  const mechanism = x.mechanism === y.mechanism ? (x.cluster === y.cluster ? 90 : 40) : 15;
  const pathway = x.pathway === y.pathway ? 95 : 20;
  const sharedPh = x.symptoms.filter((s) => y.symptoms.includes(s));
  const phenotype = Math.round((sharedPh.length / Math.max(x.symptoms.length, y.symptoms.length)) * 100);
  const gene = x.gene === y.gene ? 100 : edges.some((e) => (e.from === aId && e.to === bId) || (e.from === bId && e.to === aId)) ? 70 : x.cluster === y.cluster ? 45 : 10;
  const overall = Math.round(mechanism * 0.35 + pathway * 0.25 + phenotype * 0.25 + gene * 0.15);
  const geneRel = x.gene === y.gene ? "Same gene" : gene >= 70 ? "Direct protein partners" : x.cluster === y.cluster ? "Same complex / pathway" : "Unrelated genes";
  return { overall, mechanism, pathway, phenotype, gene, sharedPh, geneRel };
}

export function related(id: string) {
  return diseases.filter((d) => d.id !== id).map((d) => ({ d, ...breakdown(id, d.id) })).sort((a, b) => b.overall - a.overall);
}

export function whyNot(aId: string, bId: string): string[] {
  const x = diseaseById(aId)!, y = diseaseById(bId)!;
  const r: string[] = [];
  if (x.gene === y.gene && x.mechanism !== y.mechanism) r.push(`Same gene (${x.gene}) but opposite effect: ${x.mechanism} vs ${y.mechanism}. Treatments may work in opposite directions.`);
  if (x.pathway !== y.pathway) r.push(`Different pathways: ${x.pathway} vs ${y.pathway}.`);
  if (!x.symptoms.some((s) => y.symptoms.includes(s))) r.push("No shared symptoms in phenotype annotations.");
  if (!edges.some((e) => (e.from === aId && e.to === bId) || (e.from === bId && e.to === aId))) r.push("No source-backed connection found yet.");
  return r;
}

export function plainExplain(edge: Edge) {
  const a = diseaseById(edge.from)!, b = diseaseById(edge.to)!;
  const strength: Record<Tier, string> = { observed: "Scientists have seen this directly in experiments.", reported: "A trusted database lists this, but we haven't checked the original experiments.", inferred: "This is an educated guess from how the biology fits together — not confirmed in patients." };
  return `${a.name} and ${b.name} are linked because ${/^[A-Z][a-z]/.test(edge.sentence) ? edge.sentence.charAt(0).toLowerCase() + edge.sentence.slice(1) : edge.sentence} ${strength[edge.tier]} Families and researchers could compare notes, but a specialist should review before acting.`;
}

export function nextSteps(id: string) {
  const d = diseaseById(id)!;
  const top = related(id).slice(0, 2);
  const steps = [
    ...(d.assets.some((x) => x.kind === "natural history study") ? [] : [{ action: `Ask ${top[0]?.d.patientGroup ?? "a related group"} to share their natural history protocol`, who: "Patient group lead", why: `${top[0]?.overall ?? 0}% biological overlap`, effort: "Low" }]),
    { action: `Introduce ${d.name} families to ${top[0]?.d.name}`, who: "Parent / advocate", why: "Shared mechanism and symptoms", effort: "Low" },
    { action: `Check if the ${top[1]?.d.gene} mouse model fits ${d.gene}`, who: "Researcher", why: "Same pathway; avoids building a new model", effort: "Medium" },
    { action: "Generate a collaboration brief for expert review", who: "Anyone", why: "Turns connections into a concrete ask", effort: "Low" },
  ];
  return steps;
}

export const qualityMetrics = () => {
  const verified = edges.filter((e) => passages[e.id]?.result === "Verified").length;
  const tiers = { observed: 0, reported: 0, inferred: 0 } as Record<Tier, number>;
  edges.forEach((e) => tiers[e.tier]++);
  return { verifiedPct: Math.round((verified / edges.length) * 100), withQuote: edges.filter((e) => e.quote).length, tiers, contradicting: edges.filter((e) => e.contradicting).length };
};

export function resolve(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  for (const d of diseases) {
    const r = resolution[d.id];
    const names = [d.name, d.gene, ...d.synonyms, ...(r?.extraSynonyms ?? []), r?.mondo ?? "", d.patientGroup ?? ""];
    const hit = names.find((n) => n && n.toLowerCase().includes(s));
    if (hit) return { d, matched: hit };
  }
  for (const d of diseases) {
    const hit = [...d.symptoms, d.pathway, resolution[d.id]?.process ?? ""].find((n) => n.toLowerCase().includes(s));
    if (hit) return { d, matched: hit };
  }
  return null;
}

export { other };
