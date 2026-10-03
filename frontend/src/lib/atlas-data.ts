// Sample dataset for the hackathon demo. Numbers marked as placeholders on /methods.
export type Tier = "observed" | "reported" | "inferred";
export type MatchType = "disease" | "gene" | "symptom" | "patient group" | "mechanism";

export interface Source {
  id: string;
  name: string;
  url: string;
  pulled: string;
  count: number;
}
export interface Edge {
  id: string;
  from: string;
  to: string;
  type: string;
  tier: Tier;
  sentence: string;
  source: string;
  sourceRecordId?: string | undefined;
  sourceUrl?: string | undefined;
  quote?: string | undefined;
  retrieved: string;
  confidence: number;
  rule: string;
  contradicting?: string | undefined;
  /** Direct clinical evidence, deliberately separate from evidence tier. */
  clinicalProof: boolean;
  method: string;
}
export interface Asset {
  kind: "registry" | "natural history study" | "trial" | "model";
  name: string;
  owner: string;
  url: string;
}
export interface Contact {
  role: "patient group" | "lead investigator";
  name: string;
  org: string;
  source: string;
  url: string;
}
export interface Disease {
  id: string;
  name: string;
  synonyms: string[];
  gene: string;
  mechanism: "loss-of-function" | "gain-of-function";
  pathway: string;
  cluster: string;
  importance: number;
  symptoms: string[];
  patientGroup?: string;
  assets: Asset[];
  contacts: Contact[];
  openQuestions: string[];
  noRoute?: boolean;
}
export interface Cluster {
  id: string;
  name: string;
  color: string;
  pathway: string;
}

export const UPDATED = "Oct 3";

export const sources: Source[] = [
  {
    id: "clinvar",
    name: "ClinVar",
    url: "https://www.ncbi.nlm.nih.gov/clinvar/",
    pulled: "2026-10-02",
    count: 412,
  },
  {
    id: "orphanet",
    name: "Orphanet",
    url: "https://www.orpha.net/",
    pulled: "2026-10-01",
    count: 186,
  },
  {
    id: "pubmed",
    name: "PubMed",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    pulled: "2026-10-02",
    count: 1240,
  },
  {
    id: "ctgov",
    name: "ClinicalTrials.gov",
    url: "https://clinicaltrials.gov/",
    pulled: "2026-09-30",
    count: 58,
  },
  {
    id: "hpo",
    name: "Human Phenotype Ontology",
    url: "https://hpo.jax.org/",
    pulled: "2026-09-29",
    count: 930,
  },
];
export const sourceById = (id: string) => sources.find((s) => s.id === id)!;

export const clusters: Cluster[] = [
  {
    id: "snare",
    name: "SNARE vesicle fusion",
    color: "var(--primary)",
    pathway: "Presynaptic vesicle release",
  },
  {
    id: "channel",
    name: "Ion channel excitability",
    color: "var(--highlight)",
    pathway: "Neuronal excitability",
  },
  {
    id: "calcium",
    name: "P/Q calcium channel",
    color: "var(--risk)",
    pathway: "Calcium signaling",
  },
];

const a = (kind: Asset["kind"], name: string, owner: string, url: string): Asset => ({
  kind,
  name,
  owner,
  url,
});

export const diseases: Disease[] = [
  {
    id: "stxbp1",
    name: "STXBP1 encephalopathy",
    synonyms: [
      "STXBP1 disorder",
      "Munc18-1 encephalopathy",
      "DEE4",
      // STXBP1 was first identified in Ohtahara syndrome (Saitsu et al., 2008).
      // VERIFY against your own data pull before the demo, per the plan's rule
      // on named facts.
      "Ohtahara syndrome",
      "Early infantile epileptic encephalopathy",
    ],
    gene: "STXBP1",
    mechanism: "loss-of-function",
    pathway: "Presynaptic vesicle release",
    cluster: "snare",
    importance: 10,
    symptoms: ["epilepsy", "developmental delay", "tremor"],
    patientGroup: "STXBP1 Foundation",
    assets: [
      a(
        "natural history study",
        "STXBP1 Natural History Study",
        "STXBP1 Foundation",
        "https://clinicaltrials.gov/",
      ),
      a(
        "registry",
        "STXBP1 Global Registry",
        "STXBP1 Foundation",
        "https://www.stxbp1disorders.org/",
      ),
      a(
        "model",
        "Stxbp1 haploinsufficient mouse",
        "Academic consortium",
        "https://pubmed.ncbi.nlm.nih.gov/",
      ),
    ],
    contacts: [
      {
        role: "patient group",
        name: "STXBP1 Foundation",
        org: "Family foundation",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
      {
        role: "lead investigator",
        name: "Natural history study PI",
        org: "Children's hospital",
        source: "ClinicalTrials.gov",
        url: "https://clinicaltrials.gov/",
      },
    ],
    openQuestions: [
      "Which seizure outcomes transfer to STX1B?",
      "Is the mouse model valid for STX1B?",
      "What age range should cohorts share?",
    ],
  },
  {
    id: "stx1b",
    name: "STX1B-related epilepsy",
    synonyms: ["STX1B disorder", "Fever-associated epilepsy syndrome"],
    gene: "STX1B",
    mechanism: "loss-of-function",
    pathway: "Presynaptic vesicle release",
    cluster: "snare",
    importance: 6,
    symptoms: ["epilepsy", "febrile seizures", "developmental delay"],
    assets: [
      a("registry", "Small family registry (draft)", "Parent volunteers", "https://www.orpha.net/"),
    ],
    contacts: [
      {
        role: "lead investigator",
        name: "STX1B case-series author",
        org: "University neurology dept.",
        source: "PubMed",
        url: "https://pubmed.ncbi.nlm.nih.gov/",
      },
    ],
    openQuestions: [
      "No natural history study yet",
      "No dedicated patient group",
      "Unknown long-term outcomes",
    ],
  },
  {
    id: "snap25",
    name: "SNAP25 encephalopathy",
    synonyms: ["SNAP25 disorder", "CMS18"],
    gene: "SNAP25",
    mechanism: "loss-of-function",
    pathway: "Presynaptic vesicle release",
    cluster: "snare",
    importance: 5,
    symptoms: ["epilepsy", "intellectual disability", "ataxia"],
    patientGroup: "SNAP25 Families",
    assets: [
      a("registry", "SNARE disorders registry", "SNAP25 Families", "https://www.orpha.net/"),
      a(
        "natural history study",
        "SNARE natural history pilot",
        "SNAP25 Families",
        "https://clinicaltrials.gov/",
      ),
    ],
    contacts: [
      {
        role: "patient group",
        name: "SNAP25 Families",
        org: "Parent network",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
    ],
    openQuestions: ["Shared outcome measures with STXBP1?"],
  },
  {
    id: "syt1",
    name: "SYT1-associated neurodevelopmental disorder",
    synonyms: ["Baker-Gordon syndrome", "SYT1 disorder"],
    gene: "SYT1",
    mechanism: "loss-of-function",
    pathway: "Presynaptic vesicle release",
    cluster: "snare",
    importance: 4,
    symptoms: ["developmental delay", "movement disorder"],
    patientGroup: "Baker-Gordon Syndrome Network",
    assets: [
      a("registry", "SYT1 registry", "Baker-Gordon Syndrome Network", "https://www.orpha.net/"),
    ],
    contacts: [
      {
        role: "patient group",
        name: "Baker-Gordon Syndrome Network",
        org: "Parent network",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
    ],
    openQuestions: ["Registry overlaps with SNAP25 registry"],
  },
  {
    id: "scn2a",
    name: "SCN2A-related disorder",
    synonyms: ["SCN2A epilepsy"],
    gene: "SCN2A",
    mechanism: "gain-of-function",
    pathway: "Neuronal excitability",
    cluster: "channel",
    importance: 8,
    symptoms: ["epilepsy", "autism"],
    patientGroup: "FamilieSCN2A",
    assets: [
      a(
        "trial",
        "Antisense oligonucleotide trial",
        "Biotech sponsor",
        "https://clinicaltrials.gov/",
      ),
      a("registry", "SCN2A Registry", "FamilieSCN2A", "https://www.orpha.net/"),
    ],
    contacts: [
      {
        role: "patient group",
        name: "FamilieSCN2A",
        org: "Family foundation",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
    ],
    openQuestions: ["Which variants respond to channel blockers?"],
  },
  {
    id: "kcnq2",
    name: "KCNQ2 encephalopathy",
    synonyms: ["KCNQ2 DEE"],
    gene: "KCNQ2",
    mechanism: "loss-of-function",
    pathway: "Neuronal excitability",
    cluster: "channel",
    importance: 6,
    symptoms: ["neonatal seizures", "developmental delay"],
    patientGroup: "KCNQ2 Cure Alliance",
    assets: [
      a(
        "natural history study",
        "KCNQ2 natural history",
        "KCNQ2 Cure Alliance",
        "https://clinicaltrials.gov/",
      ),
    ],
    contacts: [
      {
        role: "patient group",
        name: "KCNQ2 Cure Alliance",
        org: "Family foundation",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
    ],
    openQuestions: ["Shared EEG endpoints?"],
  },
  {
    id: "cacna1a-ea2",
    name: "Episodic ataxia type 2",
    synonyms: ["EA2", "CACNA1A episodic ataxia"],
    gene: "CACNA1A",
    mechanism: "loss-of-function",
    pathway: "Calcium signaling",
    cluster: "calcium",
    importance: 5,
    symptoms: ["episodic ataxia", "nystagmus"],
    patientGroup: "CACNA1A Foundation",
    assets: [a("registry", "CACNA1A registry", "CACNA1A Foundation", "https://www.orpha.net/")],
    contacts: [
      {
        role: "patient group",
        name: "CACNA1A Foundation",
        org: "Family foundation",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
    ],
    openQuestions: ["Separate outcomes from FHM1"],
  },
  {
    id: "cacna1a-fhm1",
    name: "Familial hemiplegic migraine type 1",
    synonyms: ["FHM1", "CACNA1A migraine"],
    gene: "CACNA1A",
    mechanism: "gain-of-function",
    pathway: "Calcium signaling",
    cluster: "calcium",
    importance: 4,
    symptoms: ["hemiplegic migraine", "ataxia"],
    patientGroup: "CACNA1A Foundation",
    assets: [
      a("registry", "CACNA1A registry", "CACNA1A Foundation", "https://www.orpha.net/"),
      a("model", "FHM1 knock-in mouse", "Academic lab", "https://pubmed.ncbi.nlm.nih.gov/"),
    ],
    contacts: [
      {
        role: "patient group",
        name: "CACNA1A Foundation",
        org: "Family foundation",
        source: "Orphanet",
        url: "https://www.orpha.net/",
      },
    ],
    openQuestions: ["Opposite variant effect to EA2"],
  },
  {
    id: "vamp2",
    name: "VAMP2-related neurodevelopmental disorder",
    synonyms: ["VAMP2 disorder"],
    gene: "VAMP2",
    mechanism: "loss-of-function",
    pathway: "Presynaptic vesicle release",
    cluster: "snare",
    importance: 2,
    symptoms: ["hypotonia", "developmental delay"],
    assets: [],
    contacts: [],
    openQuestions: ["No patient group", "No shared asset", "Too few published cases"],
    noRoute: true,
  },
];
export const diseaseById = (id: string) => diseases.find((d) => d.id === id);

const e = (
  id: string,
  from: string,
  to: string,
  type: string,
  tier: Tier,
  sentence: string,
  source: string,
  confidence: number,
  rule: string,
  quote?: string,
  contradicting?: string,
  clinicalProof = false,
  sourceRecordId?: string,
): Edge => ({
  id,
  from,
  to,
  type,
  tier,
  sentence,
  source,
  sourceRecordId,
  sourceUrl: sourceById(source).url,
  confidence,
  rule,
  quote,
  contradicting,
  clinicalProof,
  method: "curated snapshot v1",
  retrieved: sourceById(source).pulled,
});

export const edges: Edge[] = [
  e(
    "e1",
    "stx1b",
    "stxbp1",
    "shared mechanism",
    "observed",
    "STX1B and STXBP1 proteins bind directly to release neurotransmitter.",
    "pubmed",
    0.92,
    "Direct binding reported in 2+ independent experimental papers",
    "Munc18-1 binds syntaxin-1 to orchestrate SNARE complex assembly.",
  ),
  e(
    "e2",
    "stx1b",
    "snap25",
    "shared mechanism",
    "reported",
    "Both genes encode parts of the same SNARE complex.",
    "orphanet",
    0.81,
    "Curated database lists both in the same pathway",
    "SNAP25 and syntaxin-1 form the core of the neuronal SNARE complex.",
  ),
  e(
    "e3",
    "stxbp1",
    "snap25",
    "shared symptoms",
    // Computed from HPO annotation overlap, so this is inferred, not reported:
    // there is no source sentence to quote.
    "inferred",
    "Both disorders commonly cause early epilepsy and developmental delay.",
    "hpo",
    0.74,
    "≥60% phenotype overlap in HPO annotations",
  ),
  e(
    "e4",
    "snap25",
    "syt1",
    "shared mechanism",
    "inferred",
    "SYT1 is the calcium sensor that triggers SNARE fusion; cohorts may overlap.",
    "pubmed",
    0.58,
    "Pathway proximity model, not yet confirmed in patients",
    undefined,
    "One case series reports distinct movement phenotypes.",
  ),
  e(
    "e5",
    "stxbp1",
    "scn2a",
    "bridge",
    "inferred",
    "Both communities run epilepsy natural history studies with similar endpoints.",
    "ctgov",
    0.52,
    "Matched endpoint terms across trial records",
  ),
  e(
    "e6",
    "scn2a",
    "kcnq2",
    "shared mechanism",
    "observed",
    "Both are neuronal ion channels causing early-onset epilepsy.",
    "clinvar",
    0.88,
    "Pathogenic variants in both genes curated for the same phenotype",
    "Pathogenic variants associated with developmental and epileptic encephalopathy.",
    undefined,
    true,
    "ClinVar:SCV000000000",
  ),
  e(
    "e7",
    "cacna1a-ea2",
    "cacna1a-fhm1",
    "same gene",
    "observed",
    "Same gene, opposite variant effects: kept in separate clusters.",
    "clinvar",
    0.95,
    "Loss vs gain of function annotations disagree",
    "Loss-of-function variants cause EA2; gain-of-function variants cause FHM1.",
  ),
  e(
    "e8",
    "stx1b",
    "vamp2",
    "shared mechanism",
    "inferred",
    "VAMP2 is the third SNARE partner, but no community or asset exists yet.",
    "pubmed",
    0.41,
    "Pathway proximity only",
  ),
];
export const edgesFor = (id: string) => edges.filter((x) => x.from === id || x.to === id);
export const other = (edge: Edge, id: string) => (edge.from === id ? edge.to : edge.from);

export interface Researcher {
  name: string;
  institution: string;
  gene: string;
  mechanism: string;
  papers: { title: string; url: string }[];
  trials: { title: string; url: string }[];
}
export const researchers: Researcher[] = [
  {
    name: "Dr. A. Lindqvist",
    institution: "Karolinska Institutet",
    gene: "STXBP1",
    mechanism: "Presynaptic vesicle release",
    papers: [
      {
        title: "Munc18-1 haploinsufficiency and synaptic failure",
        url: "https://pubmed.ncbi.nlm.nih.gov/",
      },
    ],
    trials: [],
  },
  {
    name: "Dr. M. Okafor",
    institution: "UCL Queen Square",
    gene: "SNAP25",
    mechanism: "Presynaptic vesicle release",
    papers: [
      {
        title: "SNAP25 variants in epileptic encephalopathy",
        url: "https://pubmed.ncbi.nlm.nih.gov/",
      },
    ],
    trials: [{ title: "SNARE natural history pilot", url: "https://clinicaltrials.gov/" }],
  },
  {
    name: "Dr. R. Chen",
    institution: "Stanford University",
    gene: "SYT1",
    mechanism: "Presynaptic vesicle release",
    papers: [
      { title: "Calcium sensing by synaptotagmin-1", url: "https://pubmed.ncbi.nlm.nih.gov/" },
    ],
    trials: [],
  },
  {
    name: "Dr. P. Haddad",
    institution: "Boston Children's Hospital",
    gene: "KCNQ2",
    mechanism: "Neuronal excitability",
    papers: [
      { title: "KCNQ2 openers in neonatal epilepsy", url: "https://pubmed.ncbi.nlm.nih.gov/" },
    ],
    trials: [{ title: "Potassium channel opener trial", url: "https://clinicaltrials.gov/" }],
  },
  {
    name: "Dr. S. Bianchi",
    institution: "University of Milan",
    gene: "SCN2A",
    mechanism: "Neuronal excitability",
    papers: [
      {
        title: "SCN2A gain of function and sodium blockers",
        url: "https://pubmed.ncbi.nlm.nih.gov/",
      },
    ],
    trials: [{ title: "ASO trial", url: "https://clinicaltrials.gov/" }],
  },
];

export interface Match {
  label: string;
  type: MatchType;
  diseaseId: string;
  alias?: string;
}
export function searchAtlas(q: string): Match[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const out: Match[] = [];
  for (const d of diseases) {
    if (d.name.toLowerCase().includes(s))
      out.push({ label: d.name, type: "disease", diseaseId: d.id });
    for (const syn of d.synonyms)
      if (syn.toLowerCase().includes(s))
        out.push({ label: syn, type: "disease", diseaseId: d.id, alias: syn });
    if (d.gene.toLowerCase().includes(s))
      out.push({ label: `${d.gene} — ${d.name}`, type: "gene", diseaseId: d.id, alias: d.gene });
    for (const sym of d.symptoms)
      if (sym.includes(s))
        out.push({ label: `${sym} — ${d.name}`, type: "symptom", diseaseId: d.id, alias: sym });
    if (d.patientGroup?.toLowerCase().includes(s))
      out.push({
        label: d.patientGroup,
        type: "patient group",
        diseaseId: d.id,
        alias: d.patientGroup,
      });
    if (d.pathway.toLowerCase().includes(s) || d.mechanism.includes(s))
      out.push({
        label: `${d.pathway} — ${d.name}`,
        type: "mechanism",
        diseaseId: d.id,
        alias: d.pathway,
      });
  }
  const seen = new Set<string>();
  return out.filter((m) => (seen.has(m.label) ? false : (seen.add(m.label), true))).slice(0, 8);
}

export function similarity(aId: string, bId: string) {
  const x = diseaseById(aId)!,
    y = diseaseById(bId)!;
  const mech =
    (x.pathway === y.pathway ? 0.6 : 0.1) +
    (x.mechanism === y.mechanism ? 0.3 : 0) +
    (x.cluster === y.cluster ? 0.1 : 0);
  const shared = x.symptoms.filter((s) => y.symptoms.includes(s)).length;
  const sym = shared / Math.max(x.symptoms.length, y.symptoms.length);
  return { mechanism: Math.round(mech * 100), symptoms: Math.round(sym * 100) };
}

export const coverage = { diseases: diseases.length, connections: edges.length, updated: UPDATED };
