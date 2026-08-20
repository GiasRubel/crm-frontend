import { afterEach, describe, expect, it, vi } from "vitest";

// ORGANIZATION_SLUG is read once at module scope, so each case needs a fresh
// module registry — same pattern as lib/currency.test.ts.
async function loadSlug(): Promise<string> {
  vi.resetModules();
  const mod = await import("./organization");
  return mod.ORGANIZATION_SLUG;
}

describe("ORGANIZATION_SLUG", () => {
  const original = process.env.NEXT_PUBLIC_ORGANIZATION_SLUG;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_ORGANIZATION_SLUG;
    else process.env.NEXT_PUBLIC_ORGANIZATION_SLUG = original;
  });

  it("uses the configured slug when one is set", async () => {
    process.env.NEXT_PUBLIC_ORGANIZATION_SLUG = "acme";
    await expect(loadSlug()).resolves.toBe("acme");
  });

  it('falls back to "default", matching the standalone install\'s only org', async () => {
    delete process.env.NEXT_PUBLIC_ORGANIZATION_SLUG;
    await expect(loadSlug()).resolves.toBe("default");
  });

  it("treats an empty value as unset rather than sending an empty slug", async () => {
    process.env.NEXT_PUBLIC_ORGANIZATION_SLUG = "";
    await expect(loadSlug()).resolves.toBe("default");
  });
});
