import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import * as React from "react";

import { EvidenceSection, OperationsSection } from "@/components/dashboard/evidence-ops";
import { ResearchWorkspace } from "@/components/dashboard/ResearchWorkspace";
import {
  CirclesSection,
  MessagesSection,
  ModerationSection,
} from "@/components/dashboard/sections";
import { Button } from "@/components/ui/button";
import { FamilySpace } from "@/routes/family";
import {
  ROLE_LABELS,
  resolveSection,
  sectionsFor,
  type FamilyRole,
  type SectionId,
} from "@/lib/access";
import { currentRole } from "@/lib/social";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * The dashboard shell.
 *
 * One entry point for everyone; the role decides what is in the nav. A family
 * member sees their space, their groups and their messages. A reviewer sees
 * evidence and the graph and never the family side -- the RLS refuses it, and
 * offering it in the nav would be a lie about what the product does.
 *
 * The section lives in the URL (`?section=`), so a view is linkable and the
 * back button works. `resolveSection` falls back to the role's default for
 * anything the viewer may not open, which means a stale or shared link lands
 * somewhere usable instead of erroring.
 */

export function DashboardShell({ section: requested }: { section?: string | undefined }) {
  const navigate = useNavigate();
  const [role, setRole] = React.useState<FamilyRole | null>(null);
  const [viewerId, setViewerId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "signed-out" | "unconfigured">(
    "loading",
  );

  React.useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) {
      setState("unconfigured");
      return;
    }

    let cancelled = false;

    async function resolve() {
      try {
        const { data } = await client!.auth.getUser();
        if (cancelled) return;
        if (!data.user) {
          setState("signed-out");
          return;
        }
        setViewerId(data.user.id);
        setRole(await currentRole());
        setState("ready");
      } catch {
        if (!cancelled) setState("signed-out");
      }
    }

    void resolve();
    // Re-resolve on sign-in or sign-out so the nav changes with the session
    // rather than after a reload.
    const { data: sub } = client.auth.onAuthStateChange(() => void resolve());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <Centered>
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Opening your dashboard…
      </Centered>
    );
  }

  if (state === "unconfigured") {
    return (
      <Centered>
        This build has no Supabase credentials, so there is no account to sign in to. Set
        VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or explore the public atlas from the{" "}
        <Link to="/" className="text-primary underline">
          landing page
        </Link>
        .
      </Centered>
    );
  }

  if (state === "signed-out" || role === null) {
    return <SignedOut />;
  }

  const active = resolveSection(role, requested);
  const sections = sectionsFor(role);

  return (
    <main className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background px-5 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg">
            Rare Disease Atlas
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase">
            {ROLE_LABELS[role]}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8 md:py-10">
        <nav aria-label="Dashboard sections" className="mb-8 flex flex-wrap gap-2">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === active ? "page" : undefined}
              onClick={() => void navigate({ to: "/dashboard", search: { section: item.id } })}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                item.id === active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <SectionBody section={active} viewerId={viewerId} />

        <footer className="mt-14 border-t border-border pt-5 text-xs text-muted-foreground">
          Research navigation, not medical advice. Connections and actions should be reviewed by
          qualified experts.
        </footer>
      </div>
    </main>
  );
}

function SectionBody({ section, viewerId }: { section: SectionId; viewerId: string | null }) {
  switch (section) {
    case "family":
      return <FamilySpace />;
    case "circles":
      return <CirclesSection viewerId={viewerId} />;
    case "messages":
      return <MessagesSection viewerId={viewerId} />;
    case "moderation":
      return <ModerationSection />;
    case "evidence":
      return <EvidenceSection />;
    case "operations":
      return <OperationsSection />;
    case "research":
      return <ResearchWorkspace />;
    default:
      return null;
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-secondary p-6">
      <p className="flex max-w-md items-center gap-2 rounded-[6px] border border-border bg-background px-5 py-4 text-sm">
        {children}
      </p>
    </main>
  );
}

/**
 * Signed out, the only section that exists is the family space -- and it owns
 * the magic-link flow, so rendering it here gives a real way in rather than a
 * dead-end wall.
 */
function SignedOut() {
  return (
    <main className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background px-5 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg">
            Rare Disease Atlas
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/">Public atlas</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-12">
        <div className="mb-8 flex items-start gap-3">
          <LogIn className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h1 className="font-display text-3xl leading-tight">Your private space</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Groups and conversations open once you sign in. It is a one-time link sent to your
              email — there is no password to lose.
            </p>
          </div>
        </div>
        <FamilySpace />
      </div>
    </main>
  );
}
