import * as React from "react";

import { AtlasMark } from "@/components/atlas-ui";
import { subscribeToRouteTransition } from "@/lib/route-transition";

/**
 * A short branded wipe played when someone leaves the landing page for the
 * dashboard.
 *
 * It lives at the root, beside <Outlet />, so it survives the route change it
 * is covering — mounted inside the departing route it would unmount halfway
 * through and flicker.
 *
 * It is decoration and nothing else: `pointer-events: none`, `aria-hidden`,
 * and it never gates navigation. The <Link> navigates on its own; if this
 * never ran, the only difference would be a harder cut. It also clears itself
 * on a timer rather than waiting for `animationend`, so a dropped event can't
 * leave a panel stuck over the page.
 *
 * Two triggers, because one is not enough:
 *
 * 1. The click, for a normal client-side navigation.
 * 2. Arrival, for the case the click trigger cannot cover. Clicking before
 *    React has hydrated runs no JS at all -- the anchor performs a document
 *    navigation, the page is torn down, and the departure animation never
 *    happens. Measured: pre-hydration clicks showed zero overlay frames and
 *    one full page load. So on a fresh document load that came from our own
 *    landing page, the wipe plays on the way *in* instead. Reloads and
 *    back/forward are excluded -- replaying it there would be noise.
 */

const DURATION_MS = 760;

/**
 * True when this document was loaded by following a link from our landing
 * page *to the dashboard* -- the one journey the wipe is wired for. Scoped to
 * that destination on purpose: without it, any hard load referred from "/"
 * would play the wipe, including /methods or /compare, which were never asked
 * to have one.
 */
function arrivedFromLanding() {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.pathname !== "/dashboard") return false;
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    // "reload" and "back_forward" are deliberately excluded.
    if (entry && entry.type !== "navigate") return false;
    if (!document.referrer) return false;
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin && referrer.pathname === "/";
  } catch {
    return false;
  }
}

type Mode = "wipe" | "reveal" | null;

export function RouteTransition() {
  const [mode, setMode] = React.useState<Mode>(null);

  React.useEffect(() => subscribeToRouteTransition(() => setMode("wipe")), []);

  // Arrival trigger, for the hard-navigation case. "reveal" and not "wipe":
  // the destination is already painted by the time this runs, so covering it
  // and uncovering it again would read as a backwards flash. Reveal-only
  // means the panel is simply there for a frame and then lifts.
  React.useEffect(() => {
    if (!arrivedFromLanding()) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setMode("reveal");
  }, []);

  React.useEffect(() => {
    if (!mode) return;
    const timer = window.setTimeout(() => setMode(null), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);

  if (!mode) return null;

  return (
    <div className={`atlas-transition atlas-transition-${mode}`} aria-hidden="true">
      <div className="atlas-transition-grid" />
      <div className="atlas-transition-center">
        <AtlasMark className="atlas-transition-mark" />
        <svg
          className="atlas-transition-rule"
          viewBox="0 0 220 12"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            pathLength={1}
            d="M2 7C44 2 92 10 134 5s62-3 84 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p className="atlas-transition-label">Opening your space</p>
      </div>
    </div>
  );
}
