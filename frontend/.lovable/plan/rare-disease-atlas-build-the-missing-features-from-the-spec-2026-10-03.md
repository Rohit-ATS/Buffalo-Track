# Rare Disease Atlas: build the missing features from the spec

Existing pages stay as they are: the landing page, the STXBP1 page, the dashboard, the opening animation and the glowing footer. Everything new uses a small built-in sample dataset of about 10 diseases (STXBP1, STX1B, SNAP25, CACNA1A episodic ataxia, CACNA1A hemiplegic migraine, and a few more). No login and no real backend. Every connection in the sample data has a source, a quote, a date, and a confidence number.

## Shared across every page
- **Search box in the header**, with suggestions that show the type of each match (disease, gene, symptom, patient group, mechanism)
- **"Viewing as" switch** for Maria (default), Devon, Priya and Dr. Osei, remembered on this device. It changes the order of the pages and what each one focuses on.
- **Evidence key** used everywhere: Observed (solid), Reported (outlined), Inferred (dashed)
- **Footer additions:** links to Methods and GitHub, plus the existing disclaimer
- **Loading, empty and error messages** that tell people what to do next
- Works on phones

## Landing page (existing, small additions only)
- Hook the hero search up to the new suggestions, and send matches to their disease page
- Point the three example buttons to: Maria's journey (STXBP1), the counterexample (/compare), and the gap (a disease with no route)
- Add a live coverage line, e.g. "10 diseases, 34 sourced connections, updated Oct 3"
- The current story sections stay, as you asked, even though the spec says "no marketing sections"

## New pages
1. **Disease page `/disease/$id`**: synonym banner, disease name, gene, mechanism (loss or gain of function), cluster, and three counts. It has four tabs:
   - **Journey:** a row of steps whose connecting lines are styled by evidence tier, a plain-language sentence for each step with clickable citation chips, a list of closest diseases with mechanism and symptom scores, and a "Why not connected" link
   - **Action:** columns for reuse, differs and expert review; asset cards; contacts; bridge people; a flag for duplicated effort; timeline bars with their assumptions; a "Generate collaboration brief" button
   - **Map:** a cluster map with node sizes, dashed bridge lines between clusters, a legend and a cluster filter. Clicking a node opens that disease.
   - **Evidence:** a table you can filter by tier and source
   - **No route found** state: what was searched, in which sources and when; the two closest communities; what evidence would change the answer; and how to help start the missing group
2. **Evidence drawer** slides in from the side: the connection in one sentence, its tier and type, the source link, the exact quote, the date retrieved, the confidence number and the rule behind it, and any contradicting evidence
3. **Collaboration brief** in a pop-up window: six sections with numbered citations, "Copy as email" and "Download as PDF" (uses the browser's print-to-PDF)
4. **`/compare`**: two diseases side by side, what they share and what separates them, the evidence behind the split, and a one-line verdict
5. **`/mechanisms`** (Priya): choose a mechanism and pathway to get a ranked table of clusters. Clicking a row opens that cluster on the map.
6. **`/researchers`** (Dr. Osei): enter a gene to find researchers working on the same mechanism, with their papers, trials and institution
7. **`/methods`**: counts for each source with the date pulled, basic vs deep coverage, the quote-checker rejection rate, accuracy from the 50-connection hand check, clustering stability, where OpenAI is used, and known limits

## Things to confirm later
The numbers on the Methods page, the GitHub link and the coverage figures will be clearly labeled placeholders until you send the real ones.

## Technical details
- `src/lib/atlas-data.ts`: typed sample dataset (diseases, edges, sources, assets, contacts, researchers, clusters) with search and lookup helpers
- `src/lib/persona.tsx`: a context that stores the selected persona in localStorage (read after hydration)
- Shared components: `SiteHeader`, `SearchBox` (autocomplete), `EvidenceKey`, `TierBadge`, `EvidenceDrawer` (shadcn Sheet), `BriefDialog`, `SiteFooterLinks`, `StateMessage`
- Routes: `disease.$id.tsx` (loader with notFound and error components; the tab is kept in a `?tab=` search param), `compare.tsx` (`?a=&b=`), `mechanisms.tsx`, `researchers.tsx`, `methods.tsx`. Each gets its own head() metadata and a sitemap staticData entry.
- The map is an SVG drawn in the existing pencil-sketch style, so no extra libraries are needed
- Update the AGENTS.md routing rule, since the site now has several pages, and add the work to roadmap.md
