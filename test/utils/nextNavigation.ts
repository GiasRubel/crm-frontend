import { vi } from "vitest";

/**
 * `next/navigation` hooks only work inside Next's router context. Tests set the
 * current route here; `test/setup.ts` wires the module mock globally.
 */
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

let pathname = "/dashboard";
let searchParams = new URLSearchParams();

export function setPathname(next: string) {
  pathname = next;
}

export function setSearchParams(next: string | URLSearchParams) {
  searchParams = typeof next === "string" ? new URLSearchParams(next) : next;
}

export function resetNavigation() {
  pathname = "/dashboard";
  searchParams = new URLSearchParams();
  Object.values(routerMock).forEach((fn) => fn.mockClear());
}

export const navigationMockModule = {
  usePathname: () => pathname,
  useRouter: () => routerMock,
  useSearchParams: () => searchParams,
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
};
