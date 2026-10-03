# Upgrade plan: new research features on the dashboard

The landing page stays as it is (it already has the search-first parts: headline, search, three examples, coverage line, evidence key, notice). Every working tool goes into the dashboard, which becomes the research workspace.

## Already built — upgrade, don't rebuild
- **Search**: add search by symptom, pathway/mechanism and patient group; MONDO ID matching; a short loading shimmer; a clear "You searched X, showing Y" banner with the matched synonym highlighted; recent searches; keyboard navigation.
- **Disease journey**: each step shows evidence type, a confidence meter and source availability ("2 sources / 1 quote verified").
- **Edge drawer**: add supporting vs contradicting columns, quote verification badge, "Why connected" and "Why NOT connected" panels.
- **Map**: hover highlights neighbours, zoom/reset, click a cluster to explore it.
- **Brief / PDF / email**: add next-step list and provenance footer to the brief.
- **Persona switch**: dashboard content reorders by persona (Maria sees groups and trials first, Priya mechanisms, Dr. Osei researchers and bridges).

## New on the dashboard
1. **Disease resolution card** — canonical name, MONDO ID, alternative names, gene, cross references (OMIM, Orphanet, GARD).
2. **Mechanism units** — gene + effect class (e.g. CACNA1A loss vs gain of function) with pathway, biological process, phenotypes, related diseases.
3. **Related disease discovery with similarity breakdown** — overall % split into mechanism, pathway, phenotype and gene bars, plus "why they were connected".
4. **Quote verifier** — shows the exact quote, the source passage, and a Verified / Paraphrased / Not found result.
5. **Plain-language explanation** — "Explain simply" button on any connection, written by AI from the stored evidence only, labeled as AI-generated.
6. **Clinical studies** — sample list (phase, status, sites, eligibility hint) per disease.
7. **Patient organizations and research assets** — filterable lists (registries, biobanks, mouse models, cell lines).
8. **Next-step recommendations** — ranked actions with who, why and effort.
9. **Coverage and quality panel** — diseases, edges, % edges with verified quotes, tier mix, last updated, source breakdown.
10. **Data provenance** — per item: source, retrieved date, extraction method, version.
11. **Empty, loading and gap states** — consistent across every dashboard panel.

Dashboard gets tabs/sections: Overview, Search & resolve, Mechanisms, Related, Evidence, Trials & assets, Action, Coverage. All data remains clearly marked sample data. Mobile layout checked.

## Technical details
- Extend `src/lib/atlas-data.ts`: mondoId, xrefs, phenotypes, mechanism units (gene+effect), similarity components, trials, orgs, assets, provenance, quote source passages.
- New components under `src/components/dashboard/` used by `src/routes/dashboard.tsx`; reuse AtlasShell pieces (TierBadge, EvidenceDrawer, BriefDialog).
- AI explanation requires enabling Lovable Cloud; a server function calls the AI gateway with only the edge's stored evidence. If Cloud is declined, fall back to a templated explanation.
- Verify with Playwright at desktop and phone sizes; update roadmap.md and AGENTS.md.
