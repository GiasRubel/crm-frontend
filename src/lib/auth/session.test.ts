import { describe, expect, it } from "vitest";
import {
  ID_TOKEN_CHUNK_NAMES,
  ID_TOKEN_COOKIE_NAME,
  OAUTH_COOKIE_NAME,
  SESSION_CHUNK_NAMES,
  SESSION_COOKIE_NAME,
  type SessionData,
  idTokenCookieOptions,
  joinIdTokenCookie,
  joinSessionCookie,
  oauthCookieOptions,
  sealIdToken,
  sealOAuthFlow,
  sealSession,
  sessionCookieOptions,
  splitIdTokenCookie,
  splitSessionCookie,
  unsealIdToken,
  unsealOAuthFlow,
  unsealSession,
} from "./session";

/** Minimal stand-in for Next's cookie jar: name -> value. */
function jarOf(chunks: { name: string; value: string }[]) {
  const map = new Map(chunks.map((c) => [c.name, c.value]));
  return (name: string) => map.get(name);
}

const session: SessionData = {
  accessToken: "access-token-value",
  refreshToken: "refresh-token-value",
  expiresAt: 1_800_000_000_000,
};

/** Roughly the size of a real Keycloak access+refresh token pair. */
const bigToken = (n: number) => "t".repeat(n);

describe("cookie names", () => {
  it("exposes every chunk slot so callers can clear a session completely", () => {
    expect(SESSION_CHUNK_NAMES).toEqual([
      "crm_session.0",
      "crm_session.1",
      "crm_session.2",
      "crm_session.3",
      "crm_session.4",
      "crm_session.5",
    ]);
    expect(ID_TOKEN_CHUNK_NAMES).toHaveLength(SESSION_CHUNK_NAMES.length);
    expect(ID_TOKEN_CHUNK_NAMES[0]).toBe(`${ID_TOKEN_COOKIE_NAME}.0`);
  });

  it("uses distinct base names for the three cookies", () => {
    expect(new Set([SESSION_COOKIE_NAME, ID_TOKEN_COOKIE_NAME, OAUTH_COOKIE_NAME]).size).toBe(3);
  });
});

describe("cookie options", () => {
  it("marks the session cookie httpOnly and lax so it is unreadable from JS", () => {
    expect(sessionCookieOptions.httpOnly).toBe(true);
    expect(sessionCookieOptions.sameSite).toBe("lax");
    expect(sessionCookieOptions.path).toBe("/");
    expect(sessionCookieOptions.maxAge).toBe(60 * 60 * 24 * 30);
  });

  it("scopes the id_token cookie to the logout path so it is not re-sent on every request", () => {
    expect(idTokenCookieOptions.path).toBe("/api/auth/logout");
    expect(idTokenCookieOptions.httpOnly).toBe(true);
  });

  it("gives the short-lived oauth flow cookie a 10 minute TTL", () => {
    expect(oauthCookieOptions.maxAge).toBe(600);
    expect(oauthCookieOptions.httpOnly).toBe(true);
  });
});

describe("sealSession / unsealSession", () => {
  it("round-trips the session payload", async () => {
    const sealed = await sealSession(session);
    await expect(unsealSession(sealed)).resolves.toEqual(session);
  });

  it("produces an opaque value that does not leak the raw tokens", async () => {
    const sealed = await sealSession(session);
    expect(sealed).not.toContain("access-token-value");
    expect(sealed).not.toContain("refresh-token-value");
  });

  it("returns null for a missing value", async () => {
    await expect(unsealSession(undefined)).resolves.toBeNull();
    await expect(unsealSession("")).resolves.toBeNull();
  });

  // NOTE: iron-session's unsealData swallows its own decrypt errors and returns
  // `{}` rather than throwing, so session.ts's catch never fires and the
  // declared `| null` return type is not what unreadable input actually
  // produces. What matters downstream is that no usable accessToken comes back —
  // callers that check `session.accessToken`/`expiresAt` still fall through to
  // "logged out". These tests pin that property, not the literal null.
  it("never yields a usable token for a tampered value", async () => {
    const sealed = await sealSession(session);
    const tampered = sealed.slice(0, -4) + "AAAA";
    const result = await unsealSession(tampered);
    expect(result?.accessToken).toBeUndefined();
    expect(result?.expiresAt).toBeUndefined();
  });

  it("never yields a usable token for garbage", async () => {
    const result = await unsealSession("not-a-sealed-cookie");
    expect(result?.accessToken).toBeUndefined();
  });

  it("never yields a usable token when sealed with a different secret", async () => {
    const sealed = await sealSession(session);
    const previous = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "ffffffffffffffffffffffffffffffffffffffffffffffff";
    try {
      const result = await unsealSession(sealed);
      expect(result?.accessToken).toBeUndefined();
    } finally {
      process.env.SESSION_SECRET = previous;
    }
  });

  it("round-trips a session with no refresh token", async () => {
    const noRefresh: SessionData = { accessToken: "a", expiresAt: 1 };
    await expect(unsealSession(await sealSession(noRefresh))).resolves.toEqual(noRefresh);
  });
});

describe("session cookie chunking", () => {
  it("keeps a small session in a single chunk", async () => {
    const chunks = splitSessionCookie(await sealSession(session));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].name).toBe("crm_session.0");
  });

  it("keeps every chunk under the browser's ~4 KB single-cookie limit", async () => {
    const sealed = await sealSession({ ...session, accessToken: bigToken(4000), refreshToken: bigToken(3000) });
    for (const chunk of splitSessionCookie(sealed)) {
      expect(chunk.value.length).toBeLessThanOrEqual(3000);
    }
  });

  it("splits an oversized session across numbered cookies", async () => {
    const sealed = await sealSession({ ...session, accessToken: bigToken(4000), refreshToken: bigToken(3000) });
    const chunks = splitSessionCookie(sealed);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.name)).toEqual(
      chunks.map((_, i) => `crm_session.${i}`),
    );
  });

  it("round-trips a chunked session through split -> join -> unseal", async () => {
    const big = { ...session, accessToken: bigToken(4000), refreshToken: bigToken(3000) };
    const chunks = splitSessionCookie(await sealSession(big));
    expect(chunks.length).toBeGreaterThan(1);
    await expect(unsealSession(joinSessionCookie(jarOf(chunks)))).resolves.toEqual(big);
  });

  it("fits a realistic worst-case Keycloak token pair inside the clearable slots", async () => {
    // Keycloak access + refresh tokens with a heavy role/claim set land around
    // 4 KB each; sealed that is well under the 6 x 3000 = 18 KB the chunk names
    // cover, so logout/clear can always reach every chunk that was written.
    const sealed = await sealSession({ ...session, accessToken: bigToken(4000), refreshToken: bigToken(4000) });
    expect(splitSessionCookie(sealed).length).toBeLessThanOrEqual(SESSION_CHUNK_NAMES.length);
  });

  // Documents a latent limit: splitCookie is not bounded by MAX_CHUNKS, so a
  // sealed payload over ~18 KB writes cookies (crm_session.6+) that
  // SESSION_CHUNK_NAMES cannot delete. Not reachable with today's token sizes,
  // but it would strand cookies rather than fail loudly.
  it("emits more chunks than can be cleared once the payload exceeds 18 KB", async () => {
    const sealed = await sealSession({ ...session, accessToken: bigToken(12_000), refreshToken: bigToken(12_000) });
    expect(splitSessionCookie(sealed).length).toBeGreaterThan(SESSION_CHUNK_NAMES.length);
  });
});

describe("joinSessionCookie", () => {
  it("returns undefined when no chunks are present", () => {
    expect(joinSessionCookie(() => undefined)).toBeUndefined();
  });

  it("stops at the first gap rather than concatenating across it", () => {
    const joined = joinSessionCookie(
      jarOf([
        { name: "crm_session.0", value: "aaa" },
        // .1 missing
        { name: "crm_session.2", value: "ccc" },
      ]),
    );
    expect(joined).toBe("aaa");
  });

  it("a truncated chunked session yields no usable token rather than a partial session", async () => {
    const big = { ...session, accessToken: bigToken(4000), refreshToken: bigToken(3000) };
    const chunks = splitSessionCookie(await sealSession(big));
    // Simulate the browser dropping the tail chunk — the historical redirect-loop bug.
    const truncated = joinSessionCookie(jarOf(chunks.slice(0, 1)));
    const result = await unsealSession(truncated);
    expect(result?.accessToken).toBeUndefined();
  });
});

describe("id token cookie", () => {
  it("round-trips the id token", async () => {
    const sealed = await sealIdToken("id-token-value");
    await expect(unsealIdToken(sealed)).resolves.toBe("id-token-value");
  });

  it("returns null for a missing or unreadable id token", async () => {
    await expect(unsealIdToken(undefined)).resolves.toBeNull();
    await expect(unsealIdToken("garbage")).resolves.toBeNull();
  });

  it("chunks and rejoins a realistically sized id token", async () => {
    const idToken = bigToken(4000);
    const chunks = splitIdTokenCookie(await sealIdToken(idToken));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].name).toBe("crm_id_token.0");
    await expect(unsealIdToken(joinIdTokenCookie(jarOf(chunks)))).resolves.toBe(idToken);
  });

  it("does not read session chunks by mistake", async () => {
    const sessionChunks = splitSessionCookie(await sealSession(session));
    expect(joinIdTokenCookie(jarOf(sessionChunks))).toBeUndefined();
  });
});

describe("oauth flow cookie", () => {
  const flow = { codeVerifier: "verifier-123", state: "state-abc", returnTo: "/leads?page=2" };

  it("round-trips the PKCE verifier, state and returnTo", async () => {
    await expect(unsealOAuthFlow(await sealOAuthFlow(flow))).resolves.toEqual(flow);
  });

  it("does not expose the verifier or state in the sealed value", async () => {
    const sealed = await sealOAuthFlow(flow);
    expect(sealed).not.toContain("verifier-123");
    expect(sealed).not.toContain("state-abc");
  });

  it("yields no verifier or state for a missing or tampered flow cookie", async () => {
    await expect(unsealOAuthFlow(undefined)).resolves.toBeNull();
    const tampered = await unsealOAuthFlow("tampered");
    expect(tampered?.codeVerifier).toBeUndefined();
    expect(tampered?.state).toBeUndefined();
  });
});
