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
 * Sign-up behaves the same way while Auth has email confirmations switched off,
 * so creating an account lands straight in the product. If a deployment does
 * turn confirmations on, `createAccount` reports `confirm-email` rather than
 * pretending the person is signed in.
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

export type ConfirmationResendResult =
  | { kind: "sent"; message: string }
  | { kind: "cooldown"; message: string }
  | { kind: "error"; message: string }
  | { kind: "unconfigured"; message: string };

export const CONFIRMATION_RESEND_COOLDOWN_MS = 60_000;

const recentConfirmationResends = new Map<string, number>();

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

function confirmationEmailErrorMessage(error: AuthErrorLike) {
  const details = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

  if (details.includes("email address not authorized")) {
    return "This project's email provider cannot send to this address. Ask the project owner to configure custom SMTP or add this address to the Supabase team.";
  }
  if (details.includes("email rate limit") || details.includes("over_email_send_rate_limit")) {
    return "The confirmation email service has reached its sending limit. Please wait, or ask the project owner to configure custom SMTP.";
  }
  if (error.status === 429 || details.includes("rate limit") || details.includes("rate_limit")) {
    return "Please wait a minute before requesting another confirmation email.";
  }
  return "We could not resend the confirmation email right now. Please try again shortly.";
}

const UNCONFIGURED = {
  kind: "unconfigured",
  message: "Sign-in is not configured in this build.",
} as const;

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function confirmationCooldownMessage(retryAt: number, now = Date.now()) {
  const seconds = Math.max(1, Math.ceil((retryAt - now) / 1_000));
  return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before requesting another confirmation email.`;
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
  emailRedirectTo,
}: {
  client: PasswordAuthClient | null;
  email: string;
  password: string;
  emailRedirectTo: string;
}): Promise<PasswordAuthResult> {
  if (!client) return UNCONFIGURED;

  const ruleMessage = passwordRuleMessage(password);
  if (ruleMessage) return { kind: "error", message: ruleMessage };

  const normalized = normalizedEmail(email);

  try {
    const { data, error } = await client.auth.signUp({
      email: normalized,
      password,
      options: { emailRedirectTo },
    });
    if (error) return { kind: "error", message: passwordAuthErrorMessage(error, "sign-up") };
    if (!data.session) {
      // Supabase deliberately obscures whether an existing email has already
      // registered by returning a user with no new identities. That response
      // is not proof that a confirmation email was queued. Sending people to
      // their inbox here created a dead end when confirmations were disabled.
      if (data.user?.identities?.length === 0) {
        return {
          kind: "error",
          message:
            "We could not create a new account session for this address. If you already registered, sign in with your password instead.",
        };
      }
      // Supabase applies its own per-address resend window. Mirror it here so
      // an immediate click on the resend control cannot spend another request.
      recentConfirmationResends.set(normalized, Date.now() + CONFIRMATION_RESEND_COOLDOWN_MS);
      return {
        kind: "confirm-email",
        message:
          "Your account is created, but this deployment requires email confirmation before sign-in. Check your inbox and spam folder for a confirmation link.",
      };
    }
  } catch {
    return { kind: "error", message: passwordAuthErrorMessage({}, "sign-up") };
  }

  return { kind: "signed-in" };
}

/** Requests another signup-confirmation email without exposing the provider error verbatim. */
export async function resendEmailConfirmation({
  client,
  email,
  emailRedirectTo,
  now = Date.now(),
}: {
  client: PasswordAuthClient | null;
  email: string;
  emailRedirectTo: string;
  now?: number;
}): Promise<ConfirmationResendResult> {
  if (!client) return UNCONFIGURED;

  const normalized = normalizedEmail(email);
  const retryAt = recentConfirmationResends.get(normalized);
  if (retryAt && retryAt > now) {
    return { kind: "cooldown", message: confirmationCooldownMessage(retryAt, now) };
  }
  if (retryAt) recentConfirmationResends.delete(normalized);

  try {
    const { error } = await client.auth.resend({
      type: "signup",
      email: normalized,
      options: { emailRedirectTo },
    });
    if (error) return { kind: "error", message: confirmationEmailErrorMessage(error) };
  } catch {
    return { kind: "error", message: confirmationEmailErrorMessage({}) };
  }

  recentConfirmationResends.set(normalized, now + CONFIRMATION_RESEND_COOLDOWN_MS);
  return {
    kind: "sent",
    message: "A new confirmation email has been requested. Check your inbox and spam folder.",
  };
}
