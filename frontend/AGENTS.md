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

- Keep the public experience as a search-first single landing route; supporting story sections remain in-page because the core demo is one continuous journey.
- Keep the opening sequence as a transient overlay on the landing route rather than a separate loading route, so entry and return navigation stay direct.
- Live search reads Supabase through a TanStack Start server function
  (`src/lib/atlas-search.ts`), because RLS is enabled with no policies and the
  anon key reads nothing. Keep the service-role key out of anything the browser
  imports, and never prefix it with `VITE_`.
- Do not put server-only modules under `src/server/` — Start's import protection
  blanket-denies `**/server/**` from the client environment and the build fails.
  Graph logic lives in `src/lib/atlas-graph.ts`, tested against a fake client.
