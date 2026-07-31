import "server-only";
import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE_NAME = "crm_session";
export const OAUTH_COOKIE_NAME = "crm_oauth_flow";

// Bounds how long a session can go without a fresh login — independent of the
// short-lived accessToken, which is refreshed well before expiresAt via refreshToken.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_FLOW_TTL_SECONDS = 600;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is required to run the BFF auth flow");
  }
  return secret;
}

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  /** epoch ms when accessToken expires */
  expiresAt: number;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

// Browsers hard-cap a single cookie at ~4 KB and silently DROP anything larger —
// no error, the Set-Cookie just never lands, which reads as "not logged in" and
// causes a login redirect loop. A sealed Keycloak access+refresh token pair sits
// close enough to that cap (and grows with roles/claims) that the session is
// split across numbered cookies instead of relying on it fitting.
const MAX_CHUNK_SIZE = 3000;
const MAX_CHUNKS = 6;

/** Every cookie name a chunked value may occupy — iterate to clear it completely. */
function chunkNames(baseName: string): string[] {
  return Array.from({ length: MAX_CHUNKS }, (_, i) => `${baseName}.${i}`);
}

function splitCookie(baseName: string, sealed: string): { name: string; value: string }[] {
  const chunks: { name: string; value: string }[] = [];
  for (let i = 0; i * MAX_CHUNK_SIZE < sealed.length; i++) {
    chunks.push({
      name: `${baseName}.${i}`,
      value: sealed.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE),
    });
  }
  return chunks;
}

function joinCookie(
  baseName: string,
  get: (name: string) => string | undefined,
): string | undefined {
  let sealed = "";
  for (const name of chunkNames(baseName)) {
    const part = get(name);
    if (part === undefined) break;
    sealed += part;
  }
  return sealed || undefined;
}

export const SESSION_CHUNK_NAMES = chunkNames(SESSION_COOKIE_NAME);

export const splitSessionCookie = (sealed: string) => splitCookie(SESSION_COOKIE_NAME, sealed);

export const joinSessionCookie = (get: (name: string) => string | undefined) =>
  joinCookie(SESSION_COOKIE_NAME, get);

// The id_token is only ever needed as the logout endpoint's id_token_hint —
// without it Keycloak shows an extra "Do you want to log out?" confirmation
// page. It's kept out of the main session cookie and scoped to the logout path
// so ~1.7 KB isn't re-sent on every single API request.
export const ID_TOKEN_COOKIE_NAME = "crm_id_token";
const ID_TOKEN_COOKIE_PATH = "/api/auth/logout";

export const idTokenCookieOptions = {
  ...sessionCookieOptions,
  path: ID_TOKEN_COOKIE_PATH,
};

export const ID_TOKEN_CHUNK_NAMES = chunkNames(ID_TOKEN_COOKIE_NAME);

export const splitIdTokenCookie = (sealed: string) => splitCookie(ID_TOKEN_COOKIE_NAME, sealed);

export const joinIdTokenCookie = (get: (name: string) => string | undefined) =>
  joinCookie(ID_TOKEN_COOKIE_NAME, get);

export async function sealIdToken(idToken: string): Promise<string> {
  return sealData({ idToken }, { password: getSessionSecret(), ttl: SESSION_TTL_SECONDS });
}

export async function unsealIdToken(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  try {
    const data = await unsealData<{ idToken: string }>(value, {
      password: getSessionSecret(),
      ttl: SESSION_TTL_SECONDS,
    });
    return data.idToken ?? null;
  } catch {
    return null;
  }
}

export async function sealSession(data: SessionData): Promise<string> {
  return sealData(data, { password: getSessionSecret(), ttl: SESSION_TTL_SECONDS });
}

export async function unsealSession(value: string | undefined): Promise<SessionData | null> {
  if (!value) return null;
  try {
    return await unsealData<SessionData>(value, { password: getSessionSecret(), ttl: SESSION_TTL_SECONDS });
  } catch {
    return null;
  }
}

export interface OAuthFlowData {
  codeVerifier: string;
  state: string;
  returnTo: string;
}

export const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: OAUTH_FLOW_TTL_SECONDS,
};

export async function sealOAuthFlow(data: OAuthFlowData): Promise<string> {
  return sealData(data, { password: getSessionSecret(), ttl: OAUTH_FLOW_TTL_SECONDS });
}

export async function unsealOAuthFlow(value: string | undefined): Promise<OAuthFlowData | null> {
  if (!value) return null;
  try {
    return await unsealData<OAuthFlowData>(value, { password: getSessionSecret(), ttl: OAUTH_FLOW_TTL_SECONDS });
  } catch {
    return null;
  }
}
