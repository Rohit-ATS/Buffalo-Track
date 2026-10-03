// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const isGitHubPagesBuild = process.env["GITHUB_PAGES"] === "true";
const githubPagesBasePath = process.env["GITHUB_PAGES_BASE_PATH"] ?? "/Buffalo-Track";
const staticAtlasPaths = [
  "/",
  "/dashboard",
  "/compare",
  "/mechanisms",
  "/researchers",
  "/methods",
  "/stxbp1-disorder",
  "/disease/stxbp1",
  "/disease/stx1b",
  "/disease/snap25",
  "/disease/syt1",
  "/disease/scn2a",
  "/disease/kcnq2",
  "/disease/cacna1a-ea2",
  "/disease/cacna1a-fhm1",
  "/disease/vamp2",
];

// Vite only exposes VITE_*-prefixed vars, and only to the client. Our Supabase
// credentials are server-only secrets (see src/lib/supabase.server.ts), so load
// .env into process.env ourselves to make them visible to server functions in
// `vite dev`. A real shell variable always wins over the file. In production,
// env comes from the hosting platform instead.
const fileEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

export default defineConfig({
  vite: {
    base: isGitHubPagesBuild ? `${githubPagesBasePath}/` : "/",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isGitHubPagesBuild
      ? {
          router: { basepath: githubPagesBasePath },
          spa: { enabled: false },
          prerender: {
            enabled: true,
            autoStaticPathsDiscovery: false,
            crawlLinks: false,
            failOnError: true,
          },
          pages: staticAtlasPaths.map((path) => ({ path })),
        }
      : {}),
  },
});
