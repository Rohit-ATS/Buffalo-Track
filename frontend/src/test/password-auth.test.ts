import { describe, expect, it, vi } from "vitest";

import {
  CONFIRMATION_RESEND_COOLDOWN_MS,
  MIN_PASSWORD_LENGTH,
  createAccountWithPassword,
  passwordAuthErrorMessage,
  passwordRuleMessage,
  resendEmailConfirmation,
  signInWithPassword,
} from "@/lib/password-auth";

type Client = Parameters<typeof signInWithPassword>[0]["client"];

function clientWith(auth: Record<string, unknown>) {
  return { auth } as unknown as Client;
}

const session = { access_token: "token" };

describe("password sign-in", () => {
  it("reports a live session so callers can render immediately", async () => {
    const signInWithPasswordFn = vi.fn().mockResolvedValue({ data: { session }, error: null });

    await expect(
      signInWithPassword({
        client: clientWith({ signInWithPassword: signInWithPasswordFn }),
        email: "  Caregiver@Example.com ",
        password: "a-long-enough-password",
      }),
    ).resolves.toEqual({ kind: "signed-in" });

    // The address is normalised before it reaches Auth, so "Caregiver@" and
    // "caregiver@" are one account rather than two.
    expect(signInWithPasswordFn).toHaveBeenCalledWith({
      email: "caregiver@example.com",
      password: "a-long-enough-password",
    });
  });

  it("turns a wrong password into an actionable message", async () => {
    const result = await signInWithPassword({
      client: clientWith({
        signInWithPassword: vi
          .fn()
          .mockResolvedValue({ data: {}, error: { code: "invalid_credentials", status: 400 } }),
      }),
      email: "caregiver@example.com",
      password: "not-the-password",
    });

    expect(result).toMatchObject({ kind: "error" });
    expect(result.kind === "error" && result.message).toMatch(/do not match an account/i);
  });

  it("is unconfigured rather than broken when Supabase env vars are missing", async () => {
    await expect(
      signInWithPassword({ client: null, email: "a@example.com", password: "whatever-long" }),
    ).resolves.toMatchObject({ kind: "unconfigured" });
  });
});

describe("account creation", () => {
  it("rejects a short password without calling Auth", async () => {
    const signUp = vi.fn();
    const result = await createAccountWithPassword({
      client: clientWith({ signUp }),
      email: "new@example.com",
      password: "short",
      emailRedirectTo: "https://atlas.example/dashboard",
    });

    expect(result).toMatchObject({ kind: "error" });
    expect(signUp).not.toHaveBeenCalled();
    expect(passwordRuleMessage("short")).toMatch(new RegExp(`${MIN_PASSWORD_LENGTH} characters`));
    expect(passwordRuleMessage("x".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  it("signs the new account straight in when confirmations are off", async () => {
    await expect(
      createAccountWithPassword({
        client: clientWith({
          signUp: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        }),
        email: "new@example.com",
        password: "a-long-enough-password",
        emailRedirectTo: "https://atlas.example/dashboard",
      }),
    ).resolves.toEqual({ kind: "signed-in" });
  });

  it("does not claim a session when the project requires email confirmation", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null, user: {} }, error: null });
    const result = await createAccountWithPassword({
      client: clientWith({ signUp }),
      email: "new@example.com",
      password: "a-long-enough-password",
      emailRedirectTo: "https://atlas.example/dashboard",
    });

    expect(result).toMatchObject({ kind: "confirm-email" });
    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "a-long-enough-password",
      options: { emailRedirectTo: "https://atlas.example/dashboard" },
    });
  });

  it("does not promise a confirmation email for an obscured existing account", async () => {
    const result = await createAccountWithPassword({
      client: clientWith({
        signUp: vi
          .fn()
          .mockResolvedValue({ data: { session: null, user: { identities: [] } }, error: null }),
      }),
      email: "existing@example.com",
      password: "a-long-enough-password",
      emailRedirectTo: "https://atlas.example/dashboard",
    });

    expect(result).toMatchObject({ kind: "error" });
    expect(result.kind === "error" && result.message).toMatch(/sign in with your password/i);
  });

  it("points an existing account at sign-in instead", () => {
    expect(passwordAuthErrorMessage({ code: "user_already_exists" }, "sign-up")).toMatch(
      /sign in with your password/i,
    );
    expect(passwordAuthErrorMessage({ status: 429 }, "sign-in")).toMatch(/too many attempts/i);
  });

  it("resends a confirmation once, then applies a short cooldown", async () => {
    const resend = vi.fn().mockResolvedValue({ error: null });
    const client = clientWith({ resend });
    const now = 1_000_000;
    const request = {
      client,
      email: "confirm-check@example.com",
      emailRedirectTo: "https://atlas.example/dashboard",
      now,
    };

    await expect(resendEmailConfirmation(request)).resolves.toMatchObject({ kind: "sent" });
    await expect(resendEmailConfirmation({ ...request, now: now + 1_000 })).resolves.toMatchObject({
      kind: "cooldown",
    });
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "confirm-check@example.com",
      options: { emailRedirectTo: "https://atlas.example/dashboard" },
    });
    expect(resend).toHaveBeenCalledOnce();
    expect(CONFIRMATION_RESEND_COOLDOWN_MS).toBe(60_000);
  });
});
