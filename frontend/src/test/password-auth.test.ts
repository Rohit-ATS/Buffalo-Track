import { describe, expect, it, vi } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  createAccountWithPassword,
  passwordAuthErrorMessage,
  passwordRuleMessage,
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
      }),
    ).resolves.toEqual({ kind: "signed-in" });
  });

  it("does not claim a session when the project requires email confirmation", async () => {
    const result = await createAccountWithPassword({
      client: clientWith({
        signUp: vi.fn().mockResolvedValue({ data: { session: null, user: {} }, error: null }),
      }),
      email: "new@example.com",
      password: "a-long-enough-password",
    });

    expect(result).toMatchObject({ kind: "confirm-email" });
  });

  it("points an existing account at sign-in instead", () => {
    expect(passwordAuthErrorMessage({ code: "user_already_exists" }, "sign-up")).toMatch(
      /sign in with your password/i,
    );
    expect(passwordAuthErrorMessage({ status: 429 }, "sign-in")).toMatch(/too many attempts/i);
  });
});
