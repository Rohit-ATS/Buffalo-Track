import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Email-and-password sign-in.
 *
 * This replaced the magic link. The link was private and passwordless, but it
 * cost a round trip through an inbox: request, switch apps, wait for an email
 * that the hosted provider rate-limits to two per hour, come back. People
 * arriving at a family space could not get in on their first try.
 *
 * A password signs in synchronously -- Supabase returns a session on the same
 * request, `onAuthStateChange` fires immediately, and the dashboard renders.
 * Sign-up behaves the same way while Auth has email confirmations switched off
 * (see supabase/config.toml), so creating an account lands straight in the
 * product. If a deployment does turn confirmations on, `createAccount` reports
 * `confirm-email` rather than pretending the person is signed in.
 */

/** Kept in step with `minimum_password_length` in supabase/config.toml. */
export const MIN_PASSWORD_LENGTH = 8;

type PasswordAuthClient = Pick<SupabaseClient, "auth">;

export type PasswordAuthResult =
  /** A session exists now; the auth listener will re-render. */
  | { kind: "signed-in" }
  /** Account created, but this project requires a confirmation click first. */
  | { kind: "confirm-email"; message: string }
  | { kind: "error"; message: string }
  | { kind: "unconfigured"; message: string };

type AuthErrorLike = {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
};

/**
 * Checks a new password before spending a network call on it, so the rule is
 * stated plainly instead of arriving as a provider error. Returns null when the
 * password is acceptable.
 */
export function passwordRuleMessage(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters so your family space stays yours.`;
  }
  return null;
}

/** Converts a provider response into a clear action without exposing raw Auth errors. */
export function passwordAuthErrorMessage(error: AuthErrorLike, mode: "sign-in" | "sign-up") {
  const details = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

  if (details.includes("invalid login credentials") || details.includes("invalid_credentials")) {
    return "That email and password do not match an account. Check them, or create an account instead.";
  }
  if (details.includes("user_already_exists") || details.includes("already registered")) {
    return "An account already exists for this email. Sign in with your password instead.";
  }
  if (details.includes("weak_password") || details.includes("password should be")) {
    return `That password is too easy to guess. Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (details.includes("email_not_confirmed") || details.includes("not confirmed")) {
    return "Confirm your email address first, then sign in with your password.";
  }
  if (details.includes("signup") && details.includes("disabled")) {
    return "New accounts are closed on this deployment. Ask an administrator for an invitation.";
  }
  if (details.includes("email_address_invalid") || details.includes("invalid email")) {
    return "That email address does not look right. Check it and try again.";
  }
  if (error.status === 429 || details.includes("rate limit") || details.includes("rate_limit")) {
    return "Too many attempts from this device. Wait a minute and try again.";
  }
  return mode === "sign-in"
    ? "We could not sign you in right now. Check your details and try again."
    : "We could not create your account right now. Please try again.";
}

const UNCONFIGURED: PasswordAuthResult = {
  kind: "unconfigured",
  message: "Sign-in is not configured in this build.",
};

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Signs an existing account in. The session is live when this resolves. */
export async function signInWithPassword({
  client,
  email,
  password,
}: {
  client: PasswordAuthClient | null;
  email: string;
  password: string;
}): Promise<PasswordAuthResult> {
  if (!client) return UNCONFIGURED;

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail(email),
      password,
    });
    if (error) return { kind: "error", message: passwordAuthErrorMessage(error, "sign-in") };
    if (!data.session) {
      return { kind: "error", message: passwordAuthErrorMessage({}, "sign-in") };
    }
  } catch {
    return { kind: "error", message: passwordAuthErrorMessage({}, "sign-in") };
  }

  return { kind: "signed-in" };
}

/**
 * Creates an account. With confirmations off this also signs the person in, so
 * the one form covers both halves of arriving for the first time.
 */
export async function createAccountWithPassword({
  client,
  email,
  password,
}: {
  client: PasswordAuthClient | null;
  email: string;
  password: string;
}): Promise<PasswordAuthResult> {
  if (!client) return UNCONFIGURED;

  const ruleMessage = passwordRuleMessage(password);
  if (ruleMessage) return { kind: "error", message: ruleMessage };

  try {
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail(email),
      password,
    });
    if (error) return { kind: "error", message: passwordAuthErrorMessage(error, "sign-up") };
    if (!data.session) {
      return {
        kind: "confirm-email",
        message:
          "Your account is created. Confirm your email address from the message we just sent, then sign in.",
      };
    }
  } catch {
    return { kind: "error", message: passwordAuthErrorMessage({}, "sign-up") };
  }

  return { kind: "signed-in" };
}
