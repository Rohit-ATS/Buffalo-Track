# Buffalo-Track frontend

The Rare Disease Atlas web app — a search-first landing page plus a research
workspace, over the graph store in [`../supabase`](../supabase). See the
[root README](../README.md) for database setup and how search reaches the graph.

This project was built with [Lovable](https://lovable.dev).

## Routes

| Route          | What it is                                         |
| -------------- | -------------------------------------------------- |
| `/`            | Search-first landing page and live graph lookup    |
| `/dashboard`   | Research workspace                                 |
| `/disease/$id` | A single disease: assets, contacts, open questions |
| `/compare`     | Two mechanism units side by side                   |
| `/mechanisms`  | Mechanism clusters                                 |
| `/researchers` | Leads and patient groups                           |
| `/methods`     | Sources, pull dates, and what the numbers mean     |

## Development

Needs Node.js (or Bun). From this directory:

```sh
bun install          # or: npm install
cp .env.example .env # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
bun run dev          # http://localhost:8080
```

Without `.env` the app still runs; search reports that the live atlas is not
connected and the curated sample path carries the demo. The research views are
backed by the static sample dataset in `src/lib/atlas-data.ts` either way.

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `bun run dev`       | Dev server on port 8080          |
| `bun run build`     | Production build into `.output/` |
| `bun run test`      | Vitest suite                     |
| `bun run lint`      | ESLint                           |
| `bun run format`    | Prettier write                   |
| `bunx tsc --noEmit` | Typecheck                        |

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase (server-side reads via a TanStack Start server function)
