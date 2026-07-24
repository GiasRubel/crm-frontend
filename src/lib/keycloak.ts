"use client";

import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
});

const PROCESSED_CODE_KEY = "kc_processed_code";

/** OAuth redirect params left in the URL hash after Keycloak login. */
export function hasOAuthCallbackHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes("code=") || hash.includes("error=");
}

export function getOAuthCodeFromHash(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.hash.match(/[#&]code=([^&]+)/)?.[1] ?? null;
}

/** Remove OAuth hash params so the callback URL is not kept in browser history. */
export function clearOAuthHashFromUrl(): void {
  if (typeof window === "undefined" || !window.location.hash) return;
  window.history.replaceState(
    window.history.state,
    document.title,
    window.location.pathname + window.location.search,
  );
}

/** Remember a consumed auth code so browser-back cannot replay it in this tab. */
export function markOAuthCodeProcessed(code: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PROCESSED_CODE_KEY, code);
}

/** Strip hash when the user navigates back to an already-consumed callback URL. */
export function clearStaleOAuthCallbackHash(): boolean {
  const code = getOAuthCodeFromHash();
  if (!code) return false;

  const processed = sessionStorage.getItem(PROCESSED_CODE_KEY);
  if (processed !== code) return false;

  clearOAuthHashFromUrl();
  return true;
}

export function rememberProcessedOAuthCallback(): void {
  const code = getOAuthCodeFromHash();
  if (code) markOAuthCodeProcessed(code);
  clearOAuthHashFromUrl();
}