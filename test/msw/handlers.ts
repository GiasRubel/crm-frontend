import { http, HttpResponse } from "msw";

/** Everything the browser talks to is same-origin: /api/backend/* and /api/auth/*. */
export const BACKEND = "/api/backend";

/**
 * Default handlers keep the shared harness quiet: only endpoints that are hit
 * incidentally (session bootstrap, subscription probe) live here. Tests declare
 * the endpoints they actually assert on with `server.use(...)`, so an unmocked
 * request stays a hard failure (`onUnhandledRequest: "error"`).
 */
export const handlers = [
  http.get("/api/auth/session", () =>
    HttpResponse.json({
      authenticated: true,
      deploymentMode: "standalone",
      user: {
        id: "u1",
        keycloakId: "kc-1",
        email: "admin@example.com",
        username: "admin",
        firstName: "Ada",
        lastName: "Admin",
        role: "Admin",
      },
    }),
  ),
  http.get(`${BACKEND}/subscriptions/me`, () => HttpResponse.json({ status: "active" })),
  // Header's notification bell polls these on every mount.
  http.get(`${BACKEND}/notifications`, () => HttpResponse.json([])),
  http.get(`${BACKEND}/notifications/unread-count`, () => HttpResponse.json({ count: 0 })),
];

/** Convenience builders for per-test overrides. */
export const json = (body: unknown, status = 200) =>
  HttpResponse.json(body as never, { status });

export const apiError = (status: number, message: string | string[]) =>
  HttpResponse.json({ message, statusCode: status }, { status });

export const noContent = () => new HttpResponse(null, { status: 204 });
