import { getSupabaseBrowser } from "@/lib/supabase-browser";

export type FamilyProfile = {
  id?: string;
  display_name?: string | null;
  /** Assigned through trusted administration, never browser-controlled metadata. */
  role?: "family" | "steward" | "evidence_reviewer" | "admin";
  condition: string | null;
  caregiver_role: string | null;
  age_band: string | null;
  timezone: string | null;
  language: string | null;
  help_needed: string | null;
  matching_opt_in: boolean;
};
export type FamilySuggestion = {
  id: string; kind: "person" | "circle" | "study" | "resource"; title: string; detail: string;
  reason: string; evidence_summary: string; evidence_url: string | null; source_url: string | null;
  target_circle_id: string | null; target_profile_id: string | null;
};

export async function currentUser() {
  const client = getSupabaseBrowser();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
}
export async function loadProfile(): Promise<FamilyProfile | null> {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) return null;
  const { data, error } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data as FamilyProfile | null;
}
export async function saveProfile(profile: Omit<FamilyProfile, "id">) {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) throw new Error("Sign in before saving your profile.");
  const { error } = await client.from("profiles").upsert({ id: user.id, ...profile });
  if (error) throw error;
}
export async function loadSuggestions(): Promise<FamilySuggestion[]> {
  const client = getSupabaseBrowser(); if (!client) return [];
  const { data, error } = await client.from("family_suggestions").select("*").order("created_at", { ascending: false }).limit(5);
  if (error) throw error;
  return (data ?? []) as FamilySuggestion[];
}
export async function joinCircle(circleId: string) {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) throw new Error("Sign in before joining a Circle.");
  const { error } = await client.from("circle_members").upsert({ circle_id: circleId, profile_id: user.id, status: "pending" });
  if (error) throw error;
}
export async function sendIntroduction(recipientId: string, note: string) {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) throw new Error("Sign in before sending an introduction request.");
  const { error } = await client.from("introduction_requests").insert({ sender_id: user.id, recipient_id: recipientId, note });
  if (error) throw error;
}
export async function blockProfile(profileId: string, reason: string, circleId?: string) {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) throw new Error("Sign in before blocking a member.");
  const [block, report] = await Promise.all([
    client.from("profile_blocks").upsert({ blocker_id: user.id, blocked_id: profileId }),
    client.from("member_reports").insert({ reporter_id: user.id, reported_id: profileId, circle_id: circleId ?? null, reason }),
  ]);
  if (block.error) throw block.error; if (report.error) throw report.error;
}
export async function incomingIntroductions() {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) return [];
  const { data, error } = await client.from("introduction_requests").select("id, sender_id, note, status, created_at").eq("recipient_id", user.id).eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function acceptIntroduction(id: string) {
  const client = getSupabaseBrowser(); if (!client) throw new Error("Supabase is not configured.");
  const { error } = await client.from("introduction_requests").update({ status: "accepted" }).eq("id", id);
  if (error) throw error;
  const { data, error: conversationError } = await client.from("private_conversations").select("id").eq("introduction_id", id).maybeSingle();
  if (conversationError) throw conversationError;
  return data?.id ?? null;
}
export type PrivateMessage = { id: string; body: string; sender_id: string; created_at: string };
export async function loadPrivateMessages(conversationId: string): Promise<PrivateMessage[]> {
  const client = getSupabaseBrowser(); if (!client) return [];
  const { data, error } = await client.from("private_messages").select("id, body, sender_id, created_at").eq("conversation_id", conversationId).order("created_at");
  if (error) throw error;
  return (data ?? []) as PrivateMessage[];
}
export async function sendPrivateMessage(conversationId: string, body: string) {
  const client = getSupabaseBrowser(); const user = await currentUser();
  if (!client || !user) throw new Error("Sign in before sending a private message.");
  const { error } = await client.from("private_messages").insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (error) throw error;
}
