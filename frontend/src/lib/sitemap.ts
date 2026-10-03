import type { AnyRoute, AnyRouter, ParsedLocation } from "@tanstack/react-router";

// Static sitemap URLs update automatically from each route's staticData.sitemap.
// Fix missing decisions in the route itself. For normal route changes, don't edit
// this helper or fetch /sitemap.xml. Only investigate reported issues or dynamic content queries.

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    // Required so every new route makes an explicit sitemap decision.
    // Fix missing staticData on the route; don't make this optional.
    sitemap: boolean | "exclude-subtree";
  }
}

export const sitemapRouteInventoryVersion = 1;

type RouteMatch =
  | { routeParams: Record<string, unknown>; foundRoute?: AnyRoute; parseError?: unknown }
  | [AnyRoute[], Record<string, unknown>, AnyRoute | undefined];

export function isSitemapRouteIncluded(route: AnyRoute | undefined): boolean {
  if (!route || route.isRoot || route.options.staticData?.sitemap !== true) return false;
  for (let ancestor = route.parentRoute; ancestor; ancestor = ancestor.parentRoute) {
    if (ancestor.options.staticData?.sitemap === "exclude-subtree") return false;
  }
  return true;
}

export function sitemapStaticPaths(router: AnyRouter): string[] {
  const paths = new Set<string>();
  for (const route of Object.values(router.routesById) as AnyRoute[]) {
    if (!isSitemapRouteIncluded(route) || /[$*]/.test(route.fullPath)) continue;
    const location = router.buildLocation({ to: route.fullPath });
    const path = sitemapPathForLocation(router, location, route.id);
    if (path !== undefined) paths.add(path);
  }
  return [...paths].sort();
}

export function sitemapPathForLocation(
  router: AnyRouter,
  location: Pick<ParsedLocation, "pathname" | "publicHref">,
  routeId: string,
): string | undefined {
  if (!isSafeSitemapPath(location.pathname) || !isSafeSitemapPath(location.publicHref)) return undefined;

  const result = router.getMatchedRoutes(location.pathname) as RouteMatch;
  const [params, foundRoute] = Array.isArray(result)
    ? [result[1], result[2]]
    : [result.routeParams, result.parseError ? undefined : result.foundRoute];

  return params["**"] === undefined && foundRoute?.id === routeId && isSitemapRouteIncluded(foundRoute)
    ? location.publicHref
    : undefined;
}

export interface SitemapEntry {
  path: string;
  lastmod?: string;
}

function isSafeSitemapPath(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || /[?#\\]/.test(pathname)) return false;
  try {
    return decodeURI(new URL(pathname, "https://sitemap.invalid").pathname) === decodeURI(pathname);
  } catch {
    return false;
  }
}

export function sitemapXML(baseURL: string, entries: SitemapEntry[]): string {
  const origin = new URL(baseURL);
  if (
    !/^https?:$/.test(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("The sitemap base URL must be the public site origin");
  }
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({ "&": "\u0026amp;", "<": "\u0026lt;", ">": "\u0026gt;", '"': "\u0026quot;", "'": "\u0026apos;" })[character]!,
    );
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const entry of entries) {
    if (!isSafeSitemapPath(entry.path)) throw new Error("Invalid sitemap path");
    const url = new URL(entry.path, origin);
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    urls.push(
      `<url><loc>${escape(url.href)}</loc>${entry.lastmod ? `<lastmod>${escape(entry.lastmod)}</lastmod>` : ""}</url>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}
