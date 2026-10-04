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
 */

const DURATION_MS = 760;

export function RouteTransition() {
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => subscribeToRouteTransition(() => setPlaying(true)), []);

  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [playing]);

  if (!playing) return null;

  return (
    <div className="atlas-transition" aria-hidden="true">
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
