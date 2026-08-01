import { vi } from "vitest";

/**
 * Shape of what openid-client's grant helpers return — only the parts the app
 * touches. `expiresIn()` is a method on the real TokenEndpointResponse helper.
 */
export interface TokenResponseOverrides {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expiresIn?: number;
}

export function tokenResponse(overrides: TokenResponseOverrides = {}) {
  // An explicitly-passed `undefined` must win over the default — that is how
  // tests model a provider that omits refresh_token / expires_in.
  const has = (key: keyof TokenResponseOverrides) =>
    Object.prototype.hasOwnProperty.call(overrides, key);

  return {
    access_token: has("access_token") ? overrides.access_token : "new-access-token",
    refresh_token: has("refresh_token") ? overrides.refresh_token : "new-refresh-token",
    id_token: has("id_token") ? overrides.id_token : undefined,
    expiresIn: () => (has("expiresIn") ? overrides.expiresIn : 300),
  };
}

/** A stand-in for the cached `client.Configuration` — opaque to the app code. */
export const fakeOidcConfig = { __fake: "oidc-config" };

/** Freezes Date.now so expiry-skew branches are deterministic. */
export const NOW = 1_700_000_000_000;

export function freezeTime(now = NOW) {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  return () => vi.useRealTimers();
}
