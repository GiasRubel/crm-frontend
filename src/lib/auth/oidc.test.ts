import { beforeEach, describe, expect, it, vi } from "vitest";

const discovery = vi.fn();
const allowInsecureRequests = Symbol("allowInsecureRequests");

vi.mock("openid-client", () => ({
  discovery: (...args: unknown[]) => discovery(...args),
  allowInsecureRequests,
}));

/** getOidcConfig memoises on a module-level promise — reload to reset it. */
async function freshModule() {
  vi.resetModules();
  return import("./oidc");
}

beforeEach(() => {
  discovery.mockReset();
  discovery.mockResolvedValue({ issuer: "resolved" });
  process.env.KEYCLOAK_ISSUER = "http://keycloak.test:8080/realms/crm";
  process.env.KEYCLOAK_CLIENT_ID = "crm-frontend";
  process.env.KEYCLOAK_CLIENT_SECRET = "test-client-secret";
});

describe("getOidcConfig", () => {
  it("discovers using the issuer, client id and client secret from env", async () => {
    const { getOidcConfig } = await freshModule();
    await getOidcConfig();

    const [issuer, clientId, clientSecret] = discovery.mock.calls[0];
    expect(issuer).toBeInstanceOf(URL);
    expect(String(issuer)).toBe("http://keycloak.test:8080/realms/crm");
    expect(clientId).toBe("crm-frontend");
    expect(clientSecret).toBe("test-client-secret");
  });

  it("treats the client as confidential — a secret is always passed", async () => {
    const { getOidcConfig } = await freshModule();
    await getOidcConfig();
    expect(discovery.mock.calls[0][2]).toBeTruthy();
  });

  it("opts into insecure requests for an http:// issuer (local dev)", async () => {
    const { getOidcConfig } = await freshModule();
    await getOidcConfig();
    expect(discovery.mock.calls[0][4]).toEqual({ execute: [allowInsecureRequests] });
  });

  it("does not opt into insecure requests for an https:// issuer", async () => {
    process.env.KEYCLOAK_ISSUER = "https://sso.example.com/realms/crm";
    const { getOidcConfig } = await freshModule();
    await getOidcConfig();
    expect(discovery.mock.calls[0][4]).toBeUndefined();
  });

  it("caches the configuration for the life of the process", async () => {
    const { getOidcConfig } = await freshModule();
    const [a, b] = await Promise.all([getOidcConfig(), getOidcConfig()]);

    expect(discovery).toHaveBeenCalledOnce();
    expect(a).toBe(b);
    await expect(getOidcConfig()).resolves.toBe(a);
    expect(discovery).toHaveBeenCalledOnce();
  });

  it("does not cache a failed discovery, so a later call can retry", async () => {
    discovery.mockRejectedValueOnce(new Error("keycloak unreachable"));
    const { getOidcConfig } = await freshModule();

    await expect(getOidcConfig()).rejects.toThrow("keycloak unreachable");

    discovery.mockResolvedValue({ issuer: "recovered" });
    await expect(getOidcConfig()).resolves.toEqual({ issuer: "recovered" });
    expect(discovery).toHaveBeenCalledTimes(2);
  });

  it("throws on an unparseable issuer rather than silently misconfiguring", async () => {
    process.env.KEYCLOAK_ISSUER = "not-a-url";
    const { getOidcConfig } = await freshModule();
    await expect(getOidcConfig()).rejects.toThrow();
  });
});
