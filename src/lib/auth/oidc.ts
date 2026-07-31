import "server-only";
import * as client from "openid-client";

let configPromise: Promise<client.Configuration> | null = null;

/**
 * Discovery + client config, cached for the life of the server process.
 * Keycloak's issuer is http:// in local dev — openid-client refuses non-TLS
 * requests by default, so allowInsecureRequests is opted into for that case only.
 */
export function getOidcConfig(): Promise<client.Configuration> {
  if (!configPromise) {
    configPromise = (async () => {
      const issuer = new URL(String(process.env.KEYCLOAK_ISSUER));
      const config = await client.discovery(
        issuer,
        String(process.env.KEYCLOAK_CLIENT_ID),
        String(process.env.KEYCLOAK_CLIENT_SECRET),
        undefined,
        // allowInsecureRequests must run as part of discovery — calling it on
        // the resulting Configuration afterwards is too late, since the
        // discovery request itself is already HTTPS-only by default.
        issuer.protocol === "http:" ? { execute: [client.allowInsecureRequests] } : undefined,
      );
      return config;
    })().catch((error) => {
      configPromise = null;
      throw error;
    });
  }
  return configPromise;
}
