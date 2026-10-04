import { Link } from "@tanstack/react-router";
import { LogIn, LogOut } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { PersonaSwitch } from "@/components/atlas-ui";
import { ROLE_LABELS, type FamilyRole } from "@/lib/access";
import { currentRole } from "@/lib/social";
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
      <div className="flex items-center gap-2">
        <PersonaSwitch />
        <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
          <Link to="/dashboard">
            <LogIn className="size-3.5" aria-hidden="true" /> Sign in
          </Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-2 text-xs md:flex">
        <span className="text-muted-foreground">Signed in as</span>
        <span className="font-semibold" title={email}>
          {email}
        </span>
        {role && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase">
            {ROLE_LABELS[role]}
          </span>
        )}
      </span>

      <Button asChild size="sm">
        <Link to="/dashboard">Dashboard</Link>
      </Button>

      <Button
        size="sm"
        variant="outline"
        aria-label="Sign out"
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
