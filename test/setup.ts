import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw/server";
import { navigationMockModule, resetNavigation } from "./utils/nextNavigation";

process.env.NEXT_PUBLIC_CURRENCY_CODE ??= "USD";

// next/navigation hooks require Next's router context, which does not exist in
// jsdom. Tests drive the route through test/utils/nextNavigation.ts.
vi.mock("next/navigation", () => navigationMockModule);

// An unmocked request is a bug in the test, not a silent hang.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigation();
  vi.clearAllMocks();
});

afterAll(() => server.close());

// --- jsdom gaps that Radix (dialogs, dropdowns, selects) and recharts rely on ---

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

class IntersectionObserverStub {
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Radix uses these for focus-scoping / scroll-locking; jsdom implements neither.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => {};
window.HTMLElement.prototype.releasePointerCapture = () => {};

// recharts measures its container; without a non-zero box every chart renders empty.
Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  value: 800,
});
Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  value: 600,
});
Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value: function () {
    return { width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800, x: 0, y: 0, toJSON: () => {} };
  },
});
