import { describe, expect, it, vi } from "vitest";

import {
  MAGIC_LINK_RESEND_COOLDOWN_MS,
  magicLinkErrorMessage,
  requestMagicLink,
} from "@/lib/magic-link";

describe("magic-link requests", () => {
  it("turns Supabase's email rate-limit response into an actionable message", () => {
    expect(magicLinkErrorMessage({ message: "email rate limit exceeded", status: 429 })).toMatch(
      /check your inbox for the newest link/i,
    );
    expect(magicLinkErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(/about an hour/i);
  });

  it("does not send another link for the same address during the cooldown", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { signInWithOtp } } as unknown as Parameters<
      typeof requestMagicLink
    >[0]["client"];
    const now = 1_000_000;
    const request = {
      client,
      email: "cooldown-check@example.com",
      emailRedirectTo: "https://atlas.example/family",
      now,
    };

    await expect(requestMagicLink(request)).resolves.toEqual({
      kind: "sent",
      retryAt: now + MAGIC_LINK_RESEND_COOLDOWN_MS,
    });
    await expect(requestMagicLink({ ...request, now: now + 1_000 })).resolves.toMatchObject({
      kind: "cooldown",
      retryAt: now + MAGIC_LINK_RESEND_COOLDOWN_MS,
    });
    expect(signInWithOtp).toHaveBeenCalledOnce();
  });
});
