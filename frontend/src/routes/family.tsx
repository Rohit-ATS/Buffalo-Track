import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InstagramDashboard } from "@/components/social/InstagramDashboard";
import { currentRole } from "@/lib/social";
import { currentUser } from "@/lib/family-network";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
  MIN_PASSWORD_LENGTH,
  createAccountWithPassword,
  signInWithPassword,
  type PasswordAuthResult,
} from "@/lib/password-auth";
import type { FamilyRole } from "@/lib/access";

export const Route = createFileRoute("/family")({
  staticData: { sitemap: false },
  component: FamilyRoutePage,
});

/**
 * The family network is the whole page.
 *
 * It used to sit inside a dashboard frame -- a product header, a row of section
 * pills, then a "Live Social Network Mode" bar offering to switch to a
 * three-step guided view -- above a social app that already had its own
 * navigation. Four navigations stacked on one screen, and the feed got whatever
 * height was left.
 *
 * So the frame is gone and the guided view with it. Everything the guided view
 * offered is in here: the profile editor, reviewed suggestions with their
 * evidence, circles and messages. What is left is one thing that behaves like
 * one thing.
 */
function FamilyRoutePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <FamilySpace />
    </main>
  );
}

export function FamilySpace() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [role, setRole] = useState<FamilyRole>("family");
  const [checked, setChecked] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const user = await currentUser();
        if (cancelled) return;
        setViewerId(user?.id ?? null);
        if (user) setRole((await currentRole()) ?? "family");
      } catch {
        if (!cancelled) setViewerId(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    void resolve();
    const client = getSupabaseBrowser();
    if (!client) return;
    // Signing in or out swaps the page without a reload.
    const { data } = client.auth.onAuthStateChange(() => void resolve());
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!checked) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted-foreground">Opening your family space…</p>
      </div>
    );
  }

  if (!viewerId) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-display text-3xl">Your family space is private.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sign in to see the feed, the circles you belong to, and what research has been recorded
            for your condition.
          </p>
          <Button onClick={() => setShowSignIn(true)}>Sign in</Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="size-3" aria-hidden="true" />
            Nothing here is visible to researchers or reviewers.
          </p>
        </div>
        {showSignIn && <SignIn onClose={() => setShowSignIn(false)} onSubmit={authenticate} />}
      </div>
    );
  }

  return <InstagramDashboard role={role} viewerId={viewerId} initialTab="home" />;
}

/**
 * Signs in, or creates the account, against Supabase Auth. Either way the
 * session is live when this resolves, so `onAuthStateChange` swaps the page in
 * immediately.
 */
async function authenticate(
  email: string,
  password: string,
  creating: boolean,
): Promise<PasswordAuthResult> {
  const client = getSupabaseBrowser();
  return creating
    ? createAccountWithPassword({ client, email, password })
    : signInWithPassword({ client, email, password });
}

function SignIn({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (email: string, password: string, creating: boolean) => Promise<PasswordAuthResult>;
}) {
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ tone: "problem" | "pending"; message: string } | null>(
    null,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email || !password || working) return;

    setWorking(true);
    setNotice(null);
    const result = await onSubmit(email, password, creating);
    if (result.kind !== "signed-in") {
      // "Confirm your email" is not a failure, so it does not get the error
      // styling -- the account exists and there is one step left.
      setNotice({
        tone: result.kind === "confirm-email" ? "pending" : "problem",
        message: result.message,
      });
      setWorking(false);
      // A failed attempt should not leave the password sitting in the field
      // for the next person at this screen.
      setPassword("");
    }
  }

  return (
    <Modal title={creating ? "Create your private account" : "Sign in privately"} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        {creating
          ? `Your email and a password of at least ${MIN_PASSWORD_LENGTH} characters. You are in as soon as you submit.`
          : "Your email and password. Nothing to wait for in your inbox."}
      </p>
      <form onSubmit={submit}>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-4 w-full rounded-lg border bg-background px-3 py-2"
          placeholder="you@example.com"
        />
        <input
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          required
          {...(creating ? { minLength: MIN_PASSWORD_LENGTH } : {})}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded-lg border bg-background px-3 py-2"
          placeholder={creating ? `At least ${MIN_PASSWORD_LENGTH} characters` : "Your password"}
        />
        <Button className="mt-4" type="submit" disabled={!email || !password || working}>
          {working
            ? creating
              ? "Creating…"
              : "Signing in…"
            : creating
              ? "Create account"
              : "Sign in"}
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          {creating ? "Already have an account?" : "First time here?"}{" "}
          <button
            type="button"
            onClick={() => {
              setCreating(!creating);
              setNotice(null);
            }}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {creating ? "Sign in" : "Create one"}
          </button>
        </p>
        {notice && (
          <p
            className={`mt-3 rounded-lg border bg-background p-3 text-sm ${
              notice.tone === "problem" ? "border-risk/40" : "border-primary/40"
            }`}
            role={notice.tone === "problem" ? "alert" : "status"}
          >
            {notice.message}
          </p>
        )}
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-contrast/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-soft"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-3xl">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
