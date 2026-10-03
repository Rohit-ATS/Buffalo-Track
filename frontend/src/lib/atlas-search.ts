import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { AtlasSearchResult } from "@/lib/atlas";

function getBackendUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env["BACKEND_URL"];
  return value ? value.replace(/\/$/, "") : undefined;
}

const clientCookie = "buffalo_track_client";

function signClientId(clientId: string, secret: string): string {
  return createHmac("sha256", secret).update(clientId).digest("hex");
}

function trustedClientIdentity(): { id: string; signature: string } | undefined {
  const secret = process.env["BACKEND_PROXY_SECRET"];
  if (!secret) return undefined;

  const cookie = getCookie(clientCookie);
  const [cookieId, cookieSignature] = cookie?.split(".") ?? [];
  if (cookieId && cookieSignature && cookieSignature.length === 64) {
    const expected = signClientId(cookieId, secret);
    if (timingSafeEqual(Buffer.from(cookieSignature), Buffer.from(expected))) {
      return { id: cookieId, signature: cookieSignature };
    }
  }

  const id = randomUUID();
  const signature = signClientId(id, secret);
  setCookie(clientCookie, `${id}.${signature}`, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  });
  return { id, signature };
}

async function searchBackend(
  query: string,
  identity: { id: string; signature: string } | undefined,
): Promise<AtlasSearchResult | null> {
  const backendUrl = getBackendUrl();
  if (!backendUrl) return null;

  try {
    const response = await fetch(`${backendUrl}/api/v1/search`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(identity && {
          "x-buffalo-client-id": identity.id,
          "x-buffalo-client-signature": identity.signature,
        }),
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status === 429) {
      return {
        status: "error",
        query,
        message: "The atlas is handling many searches. Please try again shortly.",
      };
    }
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return (await response.json()) as AtlasSearchResult;
  } catch (error) {
    console.error("backend atlas search failed", error);
    return { status: "error", query, message: "The atlas API is temporarily unavailable." };
  }
}

/**
 * The browser calls this over RPC; the handler body is stripped from the client
 * bundle and forwards requests to the FastAPI service. The service-role key
 * exists only in that service's environment.
 */
export const searchAtlas = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => ({ query: String(input?.query ?? "") }))
  .handler(async ({ data }): Promise<AtlasSearchResult> => {
    const backendResult = await searchBackend(data.query, trustedClientIdentity());
    return backendResult ?? { status: "unconfigured", query: data.query };
  });
