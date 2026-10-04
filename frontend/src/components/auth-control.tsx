import { Link } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { PersonaSwitch } from "@/components/atlas-ui";
import { ROLE_LABELS, type FamilyRole } from "@/lib/access";
import { currentRole } from "@/lib/social";
import { playRouteTransition } from "@/lib/route-transition";
import { trackDashboardClick } from "@/lib/track-dashboard-click";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * The landing header's account control.
 *
 * It used to be the demo persona dropdown on its own, which could say
 * "Viewing as Dr. Osei · Researcher" while the dashboard said FAMILY MEMBER —
 * two different answers to the same question, on screen at once.
 *
 * Now the real session wins whenever there is one: signed in, you see your own
 * email and the role the database gave you. The persona dropdown stays, but
 * only while signed out, where it is honestly what it always was — a way to
 * preview the four audiences before committing to an account.
 */
export function AuthControl() {
  const [role, setRole] = React.useState<FamilyRole | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    async function resolve() {
      try {
        const { data } = await client!.auth.getUser();
        if (cancelled) return;
        setEmail(data.user?.email ?? null);
        setRole(data.user ? await currentRole() : null);
      } catch {
        if (!cancelled) {
          setEmail(null);
          setRole(null);
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    void resolve();
    const { data: sub } = client.auth.onAuthStateChange(() => void resolve());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Render the signed-out shape until the session is known, so the header does
  // not flash a wrong identity on first paint.
  if (!checked || !email) {
    return (
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-surface/70 py-1 pl-3 pr-1 md:flex">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Preview
          </span>
          <PersonaSwitch compact />
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="hidden h-10 rounded-full border-border bg-background px-4 sm:inline-flex"
        >
          <Link
            to="/dashboard"
            onClick={() => {
              trackDashboardClick("landing_sign_in");
              playRouteTransition();
            }}
          >
            <LogIn className="size-4" aria-hidden="true" /> Sign in
          </Link>
        </Button>
        <Button asChild size="sm" className="h-10 rounded-full px-4 sm:px-5">
          <Link
            to="/dashboard"
            onClick={() => {
              trackDashboardClick("landing_cta");
              playRouteTransition();
            }}
          >
            Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
      <span className="hidden items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-2 text-xs lg:flex">
        <span className="text-muted-foreground">Signed in</span>
        <span className="max-w-40 truncate font-semibold" title={email}>
          {email}
        </span>
        {role && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase">
            {ROLE_LABELS[role]}
          </span>
        )}
      </span>

      <Button asChild size="sm" className="h-10 rounded-full px-4 sm:px-5">
        <Link to="/dashboard" onClick={() => trackDashboardClick("landing_cta_signed_in")}>
          Dashboard
        </Link>
      </Button>

      <Button
        size="sm"
        variant="outline"
        aria-label="Sign out"
        className="hidden h-10 rounded-full border-border px-4 lg:inline-flex"
        onClick={() => {
          void getSupabaseBrowser()?.auth.signOut();
        }}
      >
        <LogOut className="size-3.5" aria-hidden="true" />
        <span className="hidden lg:inline">Sign out</span>
      </Button>
    </div>
  );
}
