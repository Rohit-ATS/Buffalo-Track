import type { FamilyRole } from "@/lib/access";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Groups and conversations.
 *
 * Reads go straight from the browser with the anon key, because every table
 * here is protected by RLS keyed to `auth.uid()` (0012). There is no server
 * function in the path: a message has to arrive the moment it is sent, and a
 * round trip through our own backend would only add latency to something the
 * database is already securing.
 *
 * Nothing here filters by role. The policies decide what comes back; this layer
 * just asks. `src/lib/access.ts` governs what the interface *offers*, which is a
 * separate thing from what the database would allow.
 */

export type Circle = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  steward_id: string | null;
  /** The viewer's own membership, if any. */
  membership: "pending" | "active" | "blocked" | null;
  member_count: number;
};

export type CircleMessage = {
  id: string;
  circle_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type PrivateThread = {
  conversation_id: string;
  introduction_id: string;
  created_at: string;
};

export type PendingJoin = {
  circle_id: string;
  profile_id: string;
  status: string;
};

export type MemberReport = {
  id: string;
  reporter_id: string;
  reported_id: string;
  circle_id: string | null;
  reason: string;
  created_at: string;
};

function db() {
  const client = getSupabaseBrowser();
  if (!client) {
    throw new Error(
      "Supabase is not configured in this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return client;
}

/** The signed-in viewer's role, or null when signed out. */
export async function currentRole(): Promise<FamilyRole | null> {
  const client = getSupabaseBrowser();
  if (!client) return null;

  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  // A signed-in user with no profile row yet is treated as `family`: that is
  // what the insert policy will let them create, and it is the least-privileged
  // option, so guessing this way cannot widen anyone's reach.
  return ((data?.role as FamilyRole | undefined) ?? "family") satisfies FamilyRole;
}

/** Circles the viewer can see, with their own membership state attached. */
export async function loadCircles(): Promise<Circle[]> {
  const client = db();
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id ?? null;

  const { data, error } = await client
    .from("circles")
    .select("id, name, description, is_private, steward_id, circle_members(profile_id, status)")
    .order("name");

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as unknown as {
      id: string;
      name: string;
      description: string | null;
      is_private: boolean;
      steward_id: string | null;
      circle_members?: { profile_id: string; status: Circle["membership"] }[];
    }[]
  ).map((row) => {
    const members = row.circle_members ?? [];
    const mine = uid ? members.find((m) => m.profile_id === uid) : undefined;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      is_private: row.is_private,
      steward_id: row.steward_id,
      membership: mine?.status ?? null,
      // Only `active` members are counted: a pending request is not yet a
      // member, and showing it as one would overstate a circle's size.
      member_count: members.filter((m) => m.status === "active").length,
    };
  });
}

export async function loadCircleMessages(circleId: string): Promise<CircleMessage[]> {
  const { data, error } = await db()
    .from("circle_messages")
    .select("id, circle_id, sender_id, body, created_at")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as CircleMessage[];
}

export async function sendCircleMessage(circleId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) return;

  const client = db();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("Sign in to send a message.");

  const { error } = await client
    .from("circle_messages")
    .insert({ circle_id: circleId, sender_id: auth.user.id, body: trimmed });

  if (error) throw new Error(error.message);
}

/** Accepted introductions, which is where a one-to-one thread comes from. */
export async function loadPrivateThreads(): Promise<PrivateThread[]> {
  const { data, error } = await db()
    .from("private_conversation_members")
    .select("conversation_id, private_conversations(introduction_id, created_at)")
    .order("conversation_id");

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as unknown as {
      conversation_id: string;
      private_conversations?: { introduction_id: string; created_at: string } | null;
    }[]
  ).flatMap((row) =>
    row.private_conversations
      ? [
          {
            conversation_id: row.conversation_id,
            introduction_id: row.private_conversations.introduction_id,
            created_at: row.private_conversations.created_at,
          },
        ]
      : [],
  );
}

// ---------------------------------------------------------------- moderation
/** Join requests awaiting a steward's decision. */
export async function pendingJoins(): Promise<PendingJoin[]> {
  const { data, error } = await db()
    .from("circle_members")
    .select("circle_id, profile_id, status")
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return (data ?? []) as PendingJoin[];
}

export async function decideJoin(
  circleId: string,
  profileId: string,
  decision: "active" | "blocked",
): Promise<void> {
  const { error } = await db()
    .from("circle_members")
    .update({ status: decision })
    .eq("circle_id", circleId)
    .eq("profile_id", profileId);

  if (error) throw new Error(error.message);
}

export async function loadReports(): Promise<MemberReport[]> {
  const { data, error } = await db()
    .from("member_reports")
    .select("id, reporter_id, reported_id, circle_id, reason, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MemberReport[];
}

/** A stable short label for someone whose display name we are not allowed to read. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}
