/**
 * Mutable stand-in for the jar returned by `next/headers` cookies(), which is
 * only available inside a real request scope. Records writes and deletes so
 * tests can assert on what a Route Handler did to the session.
 */
export interface MockCookieJar {
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
  /** Names deleted during the test, in order. */
  readonly deleted: string[];
  /** Options passed alongside each set(), keyed by cookie name. */
  readonly options: Map<string, Record<string, unknown> | undefined>;
  readonly store: Map<string, string>;
  seed(entries: Record<string, string> | { name: string; value: string }[]): void;
}

export function createCookieJar(
  initial: Record<string, string> | { name: string; value: string }[] = {},
): MockCookieJar {
  const store = new Map<string, string>();
  const deleted: string[] = [];
  const options = new Map<string, Record<string, unknown> | undefined>();

  const seed: MockCookieJar["seed"] = (entries) => {
    const pairs = Array.isArray(entries)
      ? entries.map((e) => [e.name, e.value] as const)
      : Object.entries(entries);
    for (const [name, value] of pairs) store.set(name, value);
  };

  seed(initial);

  return {
    get: (name) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    set: (name, value, opts) => {
      store.set(name, value);
      options.set(name, opts);
    },
    delete: (name) => {
      deleted.push(name);
      store.delete(name);
    },
    deleted,
    options,
    store,
    seed,
  };
}
