import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A short client-side guard prevents a double click or a quick retry from
 * consuming another email-provider send. Supabase remains the authority for
 * its own server-side rate limits.
 */
export const MAGIC_LINK_RESEND_COOLDOWN_MS = 60_000;

const recentMagicLinkSends = new Map<string, number>();

type MagicLinkClient = Pick<SupabaseClient, "auth">;

export type MagicLinkRequestResult =
  | { kind: "sent"; retryAt: number }
  | { kind: "cooldown"; retryAt: number; message: string }
  | { kind: "error"; message: string }
  | { kind: "unconfigured"; message: string };

type AuthErrorLike = {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
};

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function secondsUntil(retryAt: number, now: number) {
  return Math.max(1, Math.ceil((retryAt - now) / 1_000));
}

export function magicLinkCooldownMessage(retryAt: number, now = Date.now()) {
  const seconds = secondsUntil(retryAt, now);
  return `We just sent a sign-in link. Please wait ${seconds} second${seconds === 1 ? "" : "s"} before requesting another one.`;
}

/** Converts a provider response into a clear action without exposing raw Auth errors. */
export function magicLinkErrorMessage(error: AuthErrorLike) {
  const details = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (details.includes("email rate limit") || details.includes("over_email_send_rate_limit")) {
    return "The sign-in email service has reached its sending limit. Check your inbox for the newest link; if it is not there, try again in about an hour.";
  }
  if (error.status === 429 || details.includes("rate limit") || details.includes("rate_limit")) {
    return "Please check your inbox first, then wait a minute before requesting another sign-in link.";
  }
  return "We could not send a sign-in link right now. Check your email address and try again.";
}

/**
 * Sends one passwordless link, sharing the same retry guard everywhere it is
 * offered in the product. The in-memory key avoids storing an email address
 * in browser storage.
 */
export async function requestMagicLink({
  client,
  email,
  emailRedirectTo,
  now = Date.now(),
}: {
  client: MagicLinkClient | null;
  email: string;
  emailRedirectTo: string;
  now?: number | undefined;
}): Promise<MagicLinkRequestResult> {
  if (!client) {
    return {
      kind: "unconfigured",
      message: "Sign-in is not configured in this build.",
    };
  }

  const key = normalizedEmail(email);
  const retryAt = recentMagicLinkSends.get(key);
  if (retryAt && retryAt > now) {
    return { kind: "cooldown", retryAt, message: magicLinkCooldownMessage(retryAt, now) };
  }
  if (retryAt) recentMagicLinkSends.delete(key);

  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo },
    });
    if (error) return { kind: "error", message: magicLinkErrorMessage(error) };
  } catch {
    return { kind: "error", message: magicLinkErrorMessage({}) };
  }

  const nextRetryAt = now + MAGIC_LINK_RESEND_COOLDOWN_MS;
  recentMagicLinkSends.set(key, nextRetryAt);
  return { kind: "sent", retryAt: nextRetryAt };
}
