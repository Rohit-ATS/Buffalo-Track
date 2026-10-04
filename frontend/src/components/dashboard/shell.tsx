import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import * as React from "react";

import {
  Constellation,
  Heart,
  Neuron,
  PaperPlane,
  Sparkle,
  Squiggle,
  Underline,
} from "@/components/sketches";

import { EvidenceSection, OperationsSection } from "@/components/dashboard/evidence-ops";
import { ResearchWorkspace } from "@/components/dashboard/ResearchWorkspace";
import {
  CirclesSection,
  MessagesSection,
  ModerationSection,
} from "@/components/dashboard/sections";
import { Button } from "@/components/ui/button";
import { trackDashboardClick } from "@/lib/track-dashboard-click";
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

export function DashboardShell({
  section: requested,
  as: previewAs,
}: {
  section?: string | undefined;
  as?: string | undefined;
}) {
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

  // An admin can preview another role's dashboard without signing in four
  // times. It only changes what the interface offers -- the database still
  // answers as this account, so this is a preview, never an impersonation.
  const canPreview = role === "admin";
  const preview = canPreview && isFamilyRole(previewAs) && previewAs !== "admin" ? previewAs : null;
  const effective: FamilyRole = preview ?? role;

  const active = resolveSection(effective, requested);
  const sections = sectionsFor(effective);

  return (
    <main className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background px-5 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg">
            Rare Disease Atlas
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {canPreview && (
              <label className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
                View as
                <select
                  value={preview ?? "admin"}
                  onChange={(event) => {
                    const next = event.target.value;
                    void navigate({
                      to: "/dashboard",
                      search: next === "admin" ? {} : { as: next },
                    });
                  }}
                  className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase outline-none focus:ring-2 focus:ring-ring"
                >
                  {(Object.keys(ROLE_LABELS) as FamilyRole[]).map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase">
              {ROLE_LABELS[role]}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8 md:py-10">
        <nav aria-label="Dashboard sections" className="mb-8 flex flex-wrap gap-2">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === active ? "page" : undefined}
              onClick={() => {
                trackDashboardClick(`dashboard_shell_section_${item.id}`, { section: item.id });
                void navigate({
                  to: "/dashboard",
                  search: preview ? { section: item.id, as: preview } : { section: item.id },
                });
              }}
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

        {preview && (
          <p className="mb-6 rounded-[6px] border border-highlight bg-surface px-4 py-3 text-sm">
            Previewing the <strong>{ROLE_LABELS[preview]}</strong> dashboard. The database still
            answers as your own account, so this shows the shape of their view, not their data.{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => void navigate({ to: "/dashboard", search: {} })}
            >
              Back to yours
            </button>
          </p>
        )}

        <SectionBody section={active} viewerId={viewerId} />

        <footer className="mt-14 border-t border-border pt-5 text-xs text-muted-foreground">
          Research navigation, not medical advice. Connections and actions should be reviewed by
          qualified experts.
        </footer>
      </div>
    </main>
  );
}

function isFamilyRole(value: string | undefined): value is FamilyRole {
  return (
    value === "family" || value === "steward" || value === "evidence_reviewer" || value === "admin"
  );
}

function SignOutButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        void getSupabaseBrowser()?.auth.signOut();
      }}
    >
      Sign out
    </Button>
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
 * Signed out, this is a sign-in page and nothing else.
 *
 * It used to render the whole family space behind a small "Sign in" button,
 * which read as a dashboard you were locked out of rather than a way in. The
 * magic-link form is now the page: one field, one button, and the reassurance
 * that matters here -- no password, nothing shared, one-time link.
 *
 * Visual language is the landing page's: display serif that rises word by
 * word, a drawn underline, handwritten notes, and sketch marks that drift.
 */
function SignedOut() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const inputId = React.useId();

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value || status === "sending") return;

    const client = getSupabaseBrowser();
    if (!client) {
      setStatus("error");
      setMessage("Sign-in is not configured in this build.");
      return;
    }

    setStatus("sending");
    setMessage(null);
    const { error } = await client.auth.signInWithOtp({
      email: value,
      // Keep landing people in their family space, the way the previous
      // modal did -- /family redirects into the dashboard's family section.
      options: { emailRedirectTo: `${window.location.origin}/family` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

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

      {/* min-h fills the viewport below the 57px header so the form sits
          centred instead of stranded above a tall empty band. */}
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 py-14 md:px-8 md:py-16 lg:min-h-[calc(100vh-57px)] lg:grid-cols-[1.05fr_.95fr] lg:py-10">
        <div>
          <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5 spin-slow text-primary" aria-hidden="true" />
            One-time link · no password
          </div>

          <h1 className="word-rise font-display text-[clamp(2.6rem,5.4vw,4.4rem)] font-medium leading-[.92]">
            {["Sign", "in", "to", "your"].map((word, i) => (
              <span key={word} style={{ animationDelay: `${i * 0.08}s` }}>
                {word}&nbsp;
              </span>
            ))}
            <span style={{ animationDelay: ".36s" }} className="relative">
              <em className="font-normal text-primary">private space.</em>
              <Underline className="absolute -bottom-3 left-0 h-5 w-full text-primary" />
            </span>
          </h1>

          <p className="mt-8 max-w-md animate-fade-in text-base leading-relaxed text-muted-foreground [animation-delay:.5s] [animation-fill-mode:both]">
            Groups and conversations open once you sign in. We email you a secure link — there is no
            password to lose.
          </p>

          {status === "sent" ? (
            <div
              className="mt-8 max-w-md animate-fade-in rounded-2xl border border-primary/30 bg-background p-6"
              role="status"
            >
              <div className="flex items-start gap-3">
                <PaperPlane className="mt-1 w-12 shrink-0 float-slow text-primary" />
                <div>
                  <p className="font-display text-2xl leading-tight">Check your inbox.</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    We sent a one-time sign-in link to <strong>{email.trim()}</strong>. It opens
                    your private space directly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setMessage(null);
                }}
                className="mt-4 font-sketch text-lg text-primary underline-offset-4 hover:underline"
              >
                use a different email →
              </button>
            </div>
          ) : (
            <form
              onSubmit={sendLink}
              className="mt-8 max-w-md animate-fade-in [animation-delay:.65s] [animation-fill-mode:both]"
            >
              <label htmlFor={inputId} className="sr-only">
                Email address
              </label>
              <div className="flex min-h-16 items-center rounded-full border border-foreground bg-background p-1.5 pl-5 shadow-search focus-within:ring-2 focus-within:ring-ring">
                <Mail className="mr-3 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  id={inputId}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                {/* Only disabled while in flight. Disabling on an empty field
                    made the page's one call to action look inert on arrival;
                    `required` already blocks an empty submit. */}
                <Button
                  type="submit"
                  className="shrink-0 rounded-full"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending
                    </>
                  ) : (
                    <>
                      Email my link <ArrowRight className="size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>

              <div className="relative mt-4 h-14">
                <svg
                  className="absolute left-6 top-0 h-12 w-24 text-foreground/70"
                  viewBox="0 0 120 65"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    pathLength={1}
                    className="sketch-draw"
                    style={{ animationDelay: ".9s" }}
                    d="M10 58C14 22 44 10 104 12M96 5l10 8-11 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="absolute left-32 top-2 max-w-[230px] rotate-[-3deg] font-sketch text-xl leading-tight text-muted-foreground">
                  that is the whole sign-up.
                </p>
              </div>

              {status === "error" && message && (
                <p
                  className="mt-2 rounded-xl border border-risk/40 bg-background p-3 text-sm"
                  role="alert"
                >
                  {message}
                </p>
              )}
            </form>
          )}

          <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="size-3" aria-hidden="true" />
            Private to you. Nothing here is visible to researchers or reviewers.
          </p>
        </div>

        {/* Decoration only. Positions are kept in separate bands so no mark
            ever crosses the handwritten note -- the sketches should frame the
            sentence, not scribble over it. */}
        <div className="relative hidden min-h-[460px] lg:block" aria-hidden="true">
          <Constellation className="absolute left-0 top-0 w-48 text-foreground/55" />
          <Sparkle className="absolute right-10 top-4 w-8 spin-slow text-highlight" />
          <Sparkle className="absolute left-56 top-24 w-4 float-fast text-primary" />

          <p className="absolute right-0 top-[38%] max-w-[260px] rotate-[-4deg] font-sketch text-2xl leading-snug">
            Your people are
            <br />
            already out there.
            <br />
            <em className="text-primary">Meet them at your pace.</em>
          </p>

          <Squiggle className="absolute left-2 top-[52%] w-28 text-primary/70" />
          <Neuron className="absolute bottom-2 left-0 w-40 text-foreground/35 float-slow" />
          <Heart className="absolute bottom-10 right-16 w-9 wiggle text-primary" />
        </div>
      </div>
    </main>
  );
}
