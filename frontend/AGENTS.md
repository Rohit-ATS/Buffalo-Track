<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Landing stays the search-first entry; research views (disease/$id, compare, mechanisms, researchers, methods) are separate routes sharing AtlasShell and the sample dataset in src/lib/atlas-data.ts, so each view is linkable.
- Keep the opening sequence as a transient overlay on the landing route rather than a separate loading route, so entry and return navigation stay direct.
- Keep the dashboard as a dedicated public research-workspace route, while the landing page remains the search-first entry experience.
- Live search reads Supabase through a TanStack Start server function
  (`src/lib/atlas-search.ts`), because RLS is enabled with no policies and the
  anon key reads nothing. Keep the service-role key out of anything the browser
  imports, and never prefix it with `VITE_`. `src/lib/atlas-data.ts` stays the
  static sample dataset for the research views.
- Do not put server-only modules under `src/server/` — Start's import protection
  blanket-denies `**/server/**` from the client environment and the build fails.
  Graph logic lives in `src/lib/atlas-graph.ts`, tested against a fake client.
