import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
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
import { SignedOutArt } from "@/components/signed-out-art";
import { trackDashboardClick } from "@/lib/track-dashboard-click";
import { InstagramDashboard } from "@/components/social/InstagramDashboard";
import {
  ROLE_LABELS,
  resolveSection,
  sectionsFor,
  type FamilyRole,
  type SectionId,
} from "@/lib/access";
import { currentRole } from "@/lib/social";
import {
  MIN_PASSWORD_LENGTH,
  createAccountWithPassword,
  resendEmailConfirmation,
  signInWithPassword,
} from "@/lib/password-auth";
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

  // Allow judges or viewers to preview any role's dashboard directly from the nav.
  const preview = isFamilyRole(previewAs) && previewAs !== role ? previewAs : null;
  const effective: FamilyRole = preview ?? role;

  const active = resolveSection(effective, requested);
  const sections = sectionsFor(effective);

  /*
   * The family space is the social network, and it takes the whole window.
   *
   * Wrapping it in this shell stacked two navigations on one screen: these
   * section pills above the app's own sidebar, both claiming to be how you
   * move around. The app's sidebar wins, because it is the one that also
   * carries the feed, the reels and the condition tabs. Its "Add-ons" links
   * call back into `navigate` here, so a steward or an admin still reaches
   * moderation and operations.
   */
  if (active === "family") {
    return (
      <InstagramDashboard
        role={effective}
        viewerId={viewerId}
        initialTab="home"
        onOpenIntegration={(section) =>
          void navigate({
            to: "/dashboard",
            search: preview ? { section, as: preview } : { section },
          })
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background px-5 py-3 md:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg">
            Rare Disease Atlas
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
              Persona view
              <select
                value={preview ?? role}
                onChange={(event) => {
                  const next = event.target.value;
                  void navigate({
                    to: "/dashboard",
                    search: next === role ? {} : { as: next },
                  });
                }}
                className="rounded-full border border-primary/40 bg-background px-3 py-1 text-[11px] font-semibold uppercase outline-none focus:ring-2 focus:ring-ring text-primary"
              >
                <option value="family">Maria (Patient Org Leader / Family)</option>
                <option value="steward">Devon (Circle Steward / Caregiver)</option>
                <option value="evidence_reviewer">
                  Dr. Osei (Academic Researcher / Clinician)
                </option>
                <option value="admin">Priya (Biotech / Pharma Scout / Admin)</option>
              </select>
            </label>
            <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase">
              {ROLE_LABELS[role]}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="w-full px-5 py-6 md:px-8 md:py-10">
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
 * sign-in form is now the page: email, password, one button.
 *
 * It takes a password rather than emailing a link. The link meant leaving for
 * an inbox and waiting on a provider that rate-limits email; a password signs
 * you in on submit, which is what people expect of a door. The same form
 * creates an account, so a first visit and a tenth visit look alike.
 *
 * Visual language is the landing page's: display serif that rises word by
 * word, a drawn underline, handwritten notes, and sketch marks that drift.
 */
function SignedOut() {
  const [mode, setMode] = React.useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "working" | "confirm" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [resendingConfirmation, setResendingConfirmation] = React.useState(false);
  const [resendNotice, setResendNotice] = React.useState<{
    message: string;
    tone: "problem" | "pending";
  } | null>(null);
  const emailId = React.useId();
  const passwordId = React.useId();

  const creating = mode === "sign-up";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value || !password || status === "working") return;

    setStatus("working");
    setMessage(null);
    setResendNotice(null);

    const client = getSupabaseBrowser();
    const result = creating
      ? await createAccountWithPassword({
          client,
          email: value,
          password,
          emailRedirectTo: new URL("/dashboard", window.location.origin).toString(),
        })
      : await signInWithPassword({ client, email: value, password });

    if (result.kind === "confirm-email") {
      setStatus("confirm");
      setMessage(result.message);
      setPassword("");
      return;
    }
    if (result.kind !== "signed-in") {
      setStatus("error");
      setMessage(result.message);
      return;
    }

    // A session exists now. The shell's own `onAuthStateChange` listener
    // swaps this page for the dashboard, so there is nothing to navigate to;
    // clearing the password keeps it out of React state while that happens.
    setPassword("");
    setStatus("idle");
  }

  async function resendConfirmation() {
    if (!email || resendingConfirmation) return;

    setResendingConfirmation(true);
    const result = await resendEmailConfirmation({
      client: getSupabaseBrowser(),
      email,
      emailRedirectTo: new URL("/dashboard", window.location.origin).toString(),
    });
    setResendNotice({
      message: result.message,
      tone: result.kind === "error" || result.kind === "unconfigured" ? "problem" : "pending",
    });
    setResendingConfirmation(false);
  }

  function switchMode() {
    setMode(creating ? "sign-in" : "sign-up");
    setStatus("idle");
    setMessage(null);
    setResendNotice(null);
  }

  return (
    <main className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background px-5 py-3 md:px-8">
        <div className="flex w-full items-center justify-between gap-3">
          <Link to="/" className="font-display text-lg">
            Rare Disease Atlas
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/" aria-label="Back to the public atlas">
              <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to atlas
            </Link>
          </Button>
        </div>
      </header>

      {/* min-h fills the viewport below the 57px header so the form sits
          centred instead of stranded above a tall empty band. */}
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 py-14 md:px-8 md:py-16 lg:min-h-[calc(100vh-57px)] lg:grid-cols-[1.05fr_.95fr] lg:py-10">
        <div>
          <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5 spin-slow text-primary" aria-hidden="true" />
            Email and password · private by default
          </div>

          <h1 className="word-rise font-display text-[clamp(2.6rem,5.4vw,4.4rem)] font-medium leading-[.92]">
            {(creating ? ["Create", "your"] : ["Sign", "in", "to", "your"]).map((word, i) => (
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
            {creating
              ? `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters. If this deployment requires it, we will ask you to confirm your email before signing in.`
              : "Groups and conversations open once you sign in. Enter your email and password and you are through."}
          </p>

          {status === "confirm" ? (
            <div
              className="mt-8 max-w-md animate-fade-in rounded-2xl border border-primary/30 bg-background p-6"
              role="status"
            >
              <div className="flex items-start gap-3">
                <PaperPlane className="mt-1 w-12 shrink-0 float-slow text-primary" />
                <div>
                  <p className="font-display text-2xl leading-tight">One confirmation left.</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void resendConfirmation()}
                disabled={resendingConfirmation}
                className="mt-4 font-sketch text-lg text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingConfirmation ? "sending confirmation…" : "resend confirmation email →"}
              </button>
              {resendNotice && (
                <p
                  className={`mt-3 rounded-xl border bg-secondary/60 p-3 text-sm leading-relaxed ${
                    resendNotice.tone === "problem" ? "border-risk/40" : "border-primary/30"
                  }`}
                  role={resendNotice.tone === "problem" ? "alert" : "status"}
                >
                  {resendNotice.message}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setStatus("idle");
                  setMessage(null);
                }}
                className="mt-4 font-sketch text-lg text-primary underline-offset-4 hover:underline"
              >
                sign in instead →
              </button>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-8 max-w-md animate-fade-in [animation-delay:.65s] [animation-fill-mode:both]"
            >
              <label htmlFor={emailId} className="sr-only">
                Email address
              </label>
              <div className="flex min-h-16 items-center rounded-full border border-foreground bg-background p-1.5 pl-5 shadow-search focus-within:ring-2 focus-within:ring-ring">
                <Mail className="mr-3 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
              </div>

              <label htmlFor={passwordId} className="sr-only">
                Password
              </label>
              <div className="mt-3 flex min-h-16 items-center rounded-full border border-foreground bg-background p-1.5 pl-5 shadow-search focus-within:ring-2 focus-within:ring-ring">
                <LockKeyhole
                  className="mr-3 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id={passwordId}
                  type="password"
                  required
                  // The browser needs to know which of the two this is, or it
                  // offers a saved password where a new one belongs.
                  autoComplete={creating ? "new-password" : "current-password"}
                  {...(creating ? { minLength: MIN_PASSWORD_LENGTH } : {})}
                  placeholder={
                    creating ? `At least ${MIN_PASSWORD_LENGTH} characters` : "Your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                {/* Only disabled while in flight. Disabling on an empty field
                    made the page's one call to action look inert on arrival;
                    `required` already blocks an empty submit. */}
                <Button
                  type="submit"
                  className="shrink-0 rounded-full"
                  disabled={status === "working"}
                >
                  {status === "working" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {creating ? "Creating" : "Signing in"}
                    </>
                  ) : (
                    <>
                      {creating ? "Create account" : "Sign in"}{" "}
                      <ArrowRight className="size-4" aria-hidden="true" />
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

              <p className="mt-4 text-sm text-muted-foreground">
                {creating ? "Already have an account?" : "First time here?"}{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {creating ? "Sign in" : "Create an account"}
                </button>
              </p>
            </form>
          )}

          <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="size-3" aria-hidden="true" />
            Private to you. Nothing here is visible to researchers or reviewers.
          </p>
        </div>

        <SignedOutArt />
      </div>
    </main>
  );
}
