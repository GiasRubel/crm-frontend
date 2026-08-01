import { afterEach, vi } from "vitest";

/**
 * Server-only code reads these at module scope. Real values are irrelevant —
 * every outbound call (Keycloak discovery, the NestJS backend) is mocked — but
 * they must be present and shaped correctly, and SESSION_SECRET must be a real
 * 32+ byte value or iron-session refuses to seal.
 */
process.env.APP_BASE_URL ??= "http://localhost:3001";
process.env.BACKEND_INTERNAL_URL ??= "http://backend.test:5000";
process.env.KEYCLOAK_ISSUER ??= "http://keycloak.test:8080";
process.env.KEYCLOAK_REALM ??= "crm";
process.env.KEYCLOAK_CLIENT_ID ??= "crm-frontend";
process.env.KEYCLOAK_CLIENT_SECRET ??= "test-client-secret";
process.env.SESSION_SECRET ??= "0123456789abcdef0123456789abcdef0123456789abcdef";

afterEach(() => {
  vi.clearAllMocks();
});
