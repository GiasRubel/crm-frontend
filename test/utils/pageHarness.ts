import { http, HttpResponse, type HttpHandler } from "msw";
import { server } from "../msw/server";

/**
 * Page components reach the network only through their feature hooks, which go
 * through `apiClient`. Driving them with msw exercises the real hook + service +
 * client path instead of a hand-built mock of every mutation object, and needs
 * no change to the page files themselves.
 */

export interface PageEndpoints {
  /** Backend path (no /api/backend prefix) -> JSON body for GET. */
  [path: string]: unknown;
}

export const paged = <T>(data: T[], overrides: Partial<{ page: number; limit: number; total: number }> = {}) => ({
  data,
  meta: {
    total: overrides.total ?? data.length,
    page: overrides.page ?? 1,
    limit: overrides.limit ?? 10,
    totalPages: Math.max(1, Math.ceil((overrides.total ?? data.length) / (overrides.limit ?? 10))),
  },
});

/** Registers GET handlers for a map of backend paths. */
export function mockGets(endpoints: PageEndpoints) {
  server.use(
    ...Object.entries(endpoints).map(([path, body]) =>
      http.get(`/api/backend${path}`, () => HttpResponse.json(body as never)),
    ),
  );
}

/** A GET that never resolves — used to assert loading states. */
export function mockPending(path: string) {
  server.use(http.get(`/api/backend${path}`, () => new Promise<never>(() => {})));
}

/** A GET that fails with an ApiError-shaped body. */
export function mockGetError(path: string, status: number, message: string) {
  server.use(
    http.get(`/api/backend${path}`, () => HttpResponse.json({ message, statusCode: status }, { status })),
  );
}

/** Captures the JSON body of the next matching write, and what it responded with. */
export function captureWrite(
  method: "post" | "patch" | "put" | "delete",
  path: string,
  respond: () => Response = () => HttpResponse.json({}) as unknown as Response,
) {
  const seen: { body?: unknown; called: boolean; pathname?: string } = { called: false };

  server.use(
    http[method](`/api/backend${path}`, async ({ request }) => {
      seen.called = true;
      seen.pathname = new URL(request.url).pathname;
      seen.body = await request.text().then((text) => (text ? JSON.parse(text) : undefined));
      return respond();
    }) as HttpHandler,
  );

  return seen;
}

/** A write that rejects, so error branches in page handlers are exercised. */
export function mockWriteError(
  method: "post" | "patch" | "put" | "delete",
  path: string,
  status: number,
  message: string | string[],
) {
  server.use(
    http[method](`/api/backend${path}`, () =>
      HttpResponse.json({ message, statusCode: status }, { status }),
    ) as HttpHandler,
  );
}
