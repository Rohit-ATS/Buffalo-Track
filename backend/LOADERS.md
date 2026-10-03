# External-data loaders

Eight loaders, one per official source the plan names, each resolving or
enriching the 9 genes / 9 mechanism units already curated in `atlas_diseases`
-- not bulk-ingesting the full universe of rare-disease data, which isn't a
realistic scope for a demo.

| Loader | Source | Writes |
| --- | --- | --- |
| `monarch.py` | Monarch Initiative API | `atlas_genes.hgnc_id`, `atlas_disease_entities.mondo_id`, `atlas_synonyms`, `atlas_sources` (release version) |
| `hpo.py` | HPO `genes_to_phenotype.txt` (bulk) | `atlas_phenotypes.hpo_id`, `atlas_symptoms.frequency`/`.info_content` |
| `clinvar.py` | NCBI e-utilities | `atlas_genes.clinvar_summary` |
| `g2p.py` | ClinGen (bulk CSVs) + EBI Gene2Phenotype (API) + Reactome/GO (API) | `atlas_genes.hgnc_id`/`.dosage_sensitivity`, `atlas_pathways.reactome_id`, printed mechanism disagreements |
| `ctgov.py` | ClinicalTrials.gov API v2 | `atlas_trials`, `atlas_trial_diseases` |
| `reporter.py` | NIH RePORTER API | `atlas_grants`, `atlas_disease_grants` |
| `epmc.py` | Europe PMC API | `atlas_publications`, `atlas_disease_publications` |
| `orgs.py` | (none -- link check only) | nothing; reports broken urls on existing `atlas_organizations` |

All eight are free, public, and need no API key -- only Supabase write access.

## Run it

```bash
cd backend
pip install -r requirements.txt
python -m app.loaders.cli run monarch         # one loader
python -m app.loaders.cli run all             # all eight, in dependency order
```

Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` -- see `.env.example`.
Every loader is idempotent (`Prefer: resolution=merge-duplicates`), so running
it again just refreshes the same rows.

## Deliberately conservative

- **hpo.py matches phenotype names exactly, not fuzzily.** A fuzzy search API
  exists but was tested and found unreliable -- its top hit for "epilepsy" was
  "Sudden unexpected death in epilepsy." Exact match resolves fewer terms (7 of
  13 curated phenotypes) but never resolves one *wrong*.
- **g2p.py's Reactome/GO pass only writes on a real word-overlap match**
  (common words like "function"/"pathway"/"signaling" excluded, since almost
  every pathway name contains one). Everything else is reported as an
  unmatched candidate, not guessed.
- **clinvar.py never infers effect_class.** Missense/nonsense describes what a
  variant does to a protein sequence; loss-of-function/gain-of-function
  describes what it does to the protein's activity -- not the same question,
  and CACNA1A's own curated split (one gene, two opposite effect classes) is
  why conflating them would be wrong.
- **g2p.py reports gene-level mechanism disagreements rather than overwriting
  curated effect_class.** G2P's "mechanism" is per-gene; ours is per
  mechanism-unit, and a gene with two curated units (CACNA1A again) can
  legitimately disagree with a single gene-level label.
- **orgs.py doesn't discover new organizations.** That's
  [backend/app/discovery/](DISCOVERY.md)'s job -- it already covers "patient
  organizations and the research infrastructure they own." This loader only
  health-checks the urls already in `atlas_organizations`.

See each module's own docstring for the source-specific detail.
