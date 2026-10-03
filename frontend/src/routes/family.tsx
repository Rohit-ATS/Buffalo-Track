import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
  acceptIntroduction,
  blockProfile,
  currentUser,
  incomingIntroductions,
  joinCircle,
  loadProfile,
  loadSuggestions,
  saveProfile,
  sendIntroduction,
  type FamilyProfile,
  type FamilySuggestion,
} from "@/lib/family-network";

export const Route = createFileRoute("/family")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Family space — Rare Disease Atlas" }] }),
  component: FamilyPage,
});

const blank: FamilyProfile = {
  condition: "",
  caregiver_role: "",
  age_band: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: "English",
  help_needed: "",
  matching_opt_in: true,
};
const preview: FamilySuggestion[] = [
  {
    id: "circle",
    kind: "circle",
    title: "The SNARE Caregiver Circle",
    detail: "14 caregivers · moderated · private",
    reason:
      "Your child’s condition and this community share a presynaptic-vesicle pathway. Families have experience with seizure tracking, registries, and natural-history studies.",
    evidence_summary: "Presynaptic vesicle pathway · 3 reviewed sources",
    evidence_url: null,
    source_url: null,
    target_circle_id: null,
    target_profile_id: null,
  },
  {
    id: "people",
    kind: "person",
    title: "2 caregivers navigating related seizure disorders",
    detail: "Open to a paced introduction",
    reason:
      "You share a school-age life stage and a question about tracking seizures without becoming a full-time researcher.",
    evidence_summary: "Shared life stage · common resource need",
    evidence_url: null,
    source_url: null,
    target_circle_id: null,
    target_profile_id: null,
  },
  {
    id: "study",
    kind: "study",
    title: "A natural-history study may be relevant",
    detail: "Review eligibility and source",
    reason:
      "The study includes your stated diagnosis and age band. Atlas does not determine eligibility.",
    evidence_summary: "ClinicalTrials.gov · reviewed source",
    evidence_url: "https://clinicaltrials.gov",
    source_url: "https://clinicaltrials.gov",
    target_circle_id: null,
    target_profile_id: null,
  },
];

function FamilyPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [suggestions, setSuggestions] = useState<FamilySuggestion[]>([]);
  const [requests, setRequests] = useState<Array<{ id: string; sender_id: string; note: string }>>(
    [],
  );
  const [modal, setModal] = useState<"profile" | "request" | "evidence" | "sign-in" | null>(null);
  const [selected, setSelected] = useState<FamilySuggestion | null>(null);
  const [notice, setNotice] = useState("");
  const [conversation, setConversation] = useState(false);
  async function refresh() {
    try {
      const user = await currentUser();
      setEmail(user?.email ?? null);
      if (!user) return;
      const [p, s, r] = await Promise.all([
        loadProfile(),
        loadSuggestions(),
        incomingIntroductions(),
      ]);
      setProfile(p);
      setSuggestions(s);
      setRequests(r as Array<{ id: string; sender_id: string; note: string }>);
      if (!p) setModal("profile");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not load your private family space.");
    }
  }
  useEffect(() => {
    void refresh();
    const client = getSupabaseBrowser();
    if (!client) return;
    const { data } = client.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function magicLink(value: string) {
    const client = getSupabaseBrowser();
    if (!client)
      return setNotice(
        "Add your teammate’s VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to activate sign-in.",
      );
    const { error } = await client.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: `${window.location.origin}/family` },
    });
    setNotice(error ? error.message : "Check your inbox for a secure sign-in link.");
    if (!error) setModal(null);
  }
  async function persist(next: FamilyProfile) {
    try {
      await saveProfile(next);
      setProfile(next);
      setModal(null);
      setNotice("Your private profile is saved. Atlas can now prepare reviewed suggestions.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Profile could not be saved.");
    }
  }
  async function action(item: FamilySuggestion, note?: string) {
    try {
      if (item.kind === "study" || item.kind === "resource") {
        window.open(
          item.source_url ?? item.evidence_url ?? "https://clinicaltrials.gov",
          "_blank",
          "noopener,noreferrer",
        );
        return;
      }
      if (item.kind === "circle" && item.target_circle_id) {
        await joinCircle(item.target_circle_id);
        setNotice("Join request sent privately to the Circle steward.");
        return;
      }
      if (item.kind === "person" && item.target_profile_id && note) {
        await sendIntroduction(item.target_profile_id, note);
        setNotice("Introduction request sent. Your personal details are still private.");
        return;
      }
      setNotice(
        "This is a preview, not a live match yet. Atlas will never invent a person or Circle just to fill the screen.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That action could not be completed.");
    }
  }
  // Unauthenticated visitors see the onboarding state only. No profile data or
  // suggested people is rendered until Supabase Auth has established a session.
  const cards = email ? (suggestions.length ? suggestions : preview) : [];
  return (
    <main className="min-h-screen bg-secondary text-foreground">
      <header className="border-b border-border bg-background/90 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="font-display text-xl">
            Rare Disease Atlas
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              <LockKeyhole className="mr-1 inline size-3" />
              Private family space
            </span>
            {email ? (
              <span className="text-xs font-semibold">{email}</span>
            ) : (
              <Button size="sm" onClick={() => setModal("sign-in")}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-9 md:px-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="eyebrow">Your private home</p>
            <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
              Good morning. Here are the three things that may help today.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Find your people, at your pace. You decide what to share, who can contact you, and
              whether to join a Circle or meet one person first.
            </p>
            {notice && (
              <p
                className="mt-4 rounded-xl border border-primary/30 bg-background p-3 text-sm"
                role="status"
              >
                {notice}
              </p>
            )}
            <div className="mt-7 grid gap-4">
              {cards.slice(0, 5).map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  live={suggestions.length > 0}
                  onEvidence={() => {
                    setSelected(item);
                    setModal("evidence");
                  }}
                  onAction={() =>
                    item.kind === "person"
                      ? (setSelected(item), setModal("request"))
                      : void action(item)
                  }
                />
              ))}
            </div>
            {!suggestions.length && email && (
              <section className="mt-7 rounded-2xl border border-dashed border-border bg-background p-5">
                <h2 className="font-display text-2xl">We have not found the right Circle yet.</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Join the waitlist for your diagnosis, ask a partner organization for an
                  introduction, or create a private “looking for peers” request. We will never
                  invent a match just to fill the screen.
                </p>
              </section>
            )}
            {conversation && (
              <section className="mt-7 rounded-2xl border border-primary/30 bg-background p-5">
                <p className="eyebrow">Private conversation</p>
                <h2 className="mt-1 font-display text-3xl">Your introduction is open</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  No email, phone number, or medical record was shared to open this conversation.
                </p>
              </section>
            )}
          </div>
          <aside className="space-y-4">
            <ProfileSummary profile={profile} onEdit={() => setModal("profile")} />
            <div className="rounded-2xl bg-contrast p-5 text-contrast-foreground">
              <HeartHandshake className="size-6 text-primary" />
              <h2 className="mt-3 font-display text-2xl">Your privacy comes first.</h2>
              <p className="mt-2 text-xs leading-relaxed text-contrast-muted">
                Peer support only—not medical advice. Every Circle is moderated and includes
                report/block controls.
              </p>
            </div>
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-border bg-background p-4 text-xs"
              >
                <p className="font-semibold">Private introduction request</p>
                <p className="mt-1 text-muted-foreground">“{request.note}”</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    void acceptIntroduction(request.id)
                      .then(() => {
                        setConversation(true);
                        setRequests((all) => all.filter((x) => x.id !== request.id));
                      })
                      .catch((e) => setNotice(e.message))
                  }
                >
                  <Check className="size-4" />
                  Accept privately
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 mt-3"
                  onClick={() =>
                    void blockProfile(request.sender_id, "Blocked from introduction request").then(
                      () => setRequests((all) => all.filter((x) => x.id !== request.id)),
                    )
                  }
                >
                  Block
                </Button>
              </div>
            ))}
          </aside>
        </div>
      </section>
      {modal === "sign-in" && <SignIn onClose={() => setModal(null)} onSubmit={magicLink} />}{" "}
      {modal === "profile" && (
        <ProfileForm profile={profile ?? blank} onClose={() => setModal(null)} onSave={persist} />
      )}{" "}
      {modal === "evidence" && selected && (
        <Modal title="Evidence behind this suggestion" onClose={() => setModal(null)}>
          <p className="text-sm">{selected.evidence_summary}</p>
          {selected.evidence_url && (
            <a
              className="mt-4 inline-block text-sm font-semibold text-primary underline"
              href={selected.evidence_url}
              target="_blank"
              rel="noreferrer"
            >
              Open reviewed source
            </a>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Atlas suggestions are navigation, not medical advice.
          </p>
        </Modal>
      )}{" "}
      {modal === "request" && selected && (
        <Request
          onClose={() => setModal(null)}
          onSend={(note) => {
            void action(selected, note);
            setModal(null);
          }}
        />
      )}
    </main>
  );
}
function Card({
  item,
  live,
  onEvidence,
  onAction,
}: {
  item: FamilySuggestion;
  live: boolean;
  onEvidence: () => void;
  onAction: () => void;
}) {
  const action =
    item.kind === "circle"
      ? "Request to join"
      : item.kind === "person"
        ? "Request introduction"
        : "See eligibility";
  return (
    <article className="rounded-2xl border border-border bg-background p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="section-tag text-primary">{item.kind}</span>
          <h2 className="mt-3 font-display text-2xl">{item.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
        </div>
        {live && <ShieldCheck className="size-5 text-primary" />}
      </div>
      <div className="mt-4 rounded-xl bg-surface p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Why Atlas suggested this
        </p>
        <p className="mt-1 text-sm leading-relaxed">{item.reason}</p>
        <button
          onClick={onEvidence}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <BookOpen className="size-3.5" />
          See the evidence
        </button>
      </div>
      <Button className="mt-4" onClick={onAction}>
        {action}
        <ArrowRight className="size-4" />
      </Button>
    </article>
  );
}
function ProfileSummary({
  profile,
  onEdit,
}: {
  profile: FamilyProfile | null;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Your profile</h2>
        <button onClick={onEdit} className="text-xs font-semibold text-primary">
          {profile ? "Edit" : "Create"}
        </button>
      </div>
      {profile ? (
        <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
          <div>
            <dt className="font-semibold text-foreground">Condition</dt>
            <dd>{profile.condition}</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Role · life stage</dt>
            <dd>
              {profile.caregiver_role} · {profile.age_band}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Language · time zone</dt>
            <dd>
              {profile.language} · {profile.timezone}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Create an opt-in profile to receive live, explainable suggestions.
        </p>
      )}
    </div>
  );
}
function ProfileForm({
  profile,
  onSave,
  onClose,
}: {
  profile: FamilyProfile;
  onSave: (p: FamilyProfile) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const fields: Array<[keyof FamilyProfile, string]> = [
    ["condition", "Condition"],
    ["caregiver_role", "Caregiver or patient role"],
    ["age_band", "Age band"],
    ["timezone", "Location / time zone"],
    ["language", "Language"],
    ["help_needed", "What help would be useful?"],
  ];
  return (
    <Modal title="Find your people, at your pace" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Only share what you want Atlas to use. You can change this at any time.
      </p>
      {fields.map(([key, label]) => (
        <label key={key} className="mb-3 block text-xs font-semibold">
          {label}
          <input
            value={String(draft[key] ?? "")}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal"
          />
        </label>
      ))}
      <label className="mb-4 flex gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.matching_opt_in}
          onChange={(e) => setDraft({ ...draft, matching_opt_in: e.target.checked })}
        />
        Use these details to suggest people, Circles, and studies.
      </label>
      <Button onClick={() => onSave(draft)}>
        <Check className="size-4" />
        Save private profile
      </Button>
    </Modal>
  );
}
function SignIn({ onClose, onSubmit }: { onClose: () => void; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <Modal title="Sign in privately" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        We’ll email a secure magic link—no password required.
      </p>
      <input
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-4 w-full rounded-lg border bg-background px-3 py-2"
        placeholder="you@example.com"
      />
      <Button className="mt-4" disabled={!email} onClick={() => onSubmit(email)}>
        Email me a magic link
      </Button>
    </Modal>
  );
}
function Request({ onClose, onSend }: { onClose: () => void; onSend: (note: string) => void }) {
  const [note, setNote] = useState("I’d appreciate learning how other families approach this.");
  return (
    <Modal title="Send a request, not your personal details" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        The recipient can accept, decline, or suggest a small group conversation.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-4 min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
      />
      <Button className="mt-4" onClick={() => onSend(note)}>
        Send private request
      </Button>
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
