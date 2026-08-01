import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../msw/server";

export interface CapturedRequest {
  method: string;
  pathname: string;
  search: URLSearchParams;
  body: string;
}

/**
 * Runs `call` with a catch-all handler mounted on the BFF base, returning what
 * the service layer actually put on the wire.
 */
export async function captureRequest(
  call: () => Promise<unknown>,
  respond: () => Response = () => HttpResponse.json({}) as unknown as Response,
): Promise<CapturedRequest> {
  let captured: CapturedRequest | undefined;

  server.use(
    http.all("/api/backend/*", async ({ request }) => {
      const url = new URL(request.url);
      captured = {
        method: request.method,
        pathname: url.pathname,
        search: url.searchParams,
        body: await request.text(),
      };
      return respond();
    }),
  );

  await call();
  if (!captured) throw new Error("The service made no HTTP request");
  return captured;
}

export interface ApiCase {
  /** Test name, e.g. "getAll -> GET /customers". */
  name: string;
  call: () => Promise<unknown>;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Expected path on the backend, without the /api/backend prefix. */
  path: string;
  /** Expected query params; asserted exactly (no extras allowed). */
  query?: Record<string, string>;
  /** Expected JSON request body. Omit for none. */
  body?: unknown;
  /** Backend response to hand back; defaults to `{}`. */
  respond?: () => Response;
}

/**
 * Declarative contract suite for a `features/<d>/services/<x>Api.ts` object:
 * every method's verb, URL, query encoding and body in one table.
 */
export function describeApiContract(label: string, cases: ApiCase[]) {
  describe(label, () => {
    it.each(cases.map((c) => [c.name, c] as const))("%s", async (_name, testCase) => {
      const req = await captureRequest(testCase.call, testCase.respond);

      expect(req.method).toBe(testCase.method);
      expect(req.pathname).toBe(`/api/backend${testCase.path}`);
      expect(Object.fromEntries(req.search)).toEqual(testCase.query ?? {});

      if (testCase.body === undefined) {
        expect(req.body).toBe("");
      } else {
        expect(JSON.parse(req.body)).toEqual(testCase.body);
      }
    });
  });
}
