# Testing — crm-frontend

Quick reference for running and extending the test suite. For the full design
rationale (why msw, why two Vitest projects, per-domain conventions), see the
approved plan this suite was built from; this doc is just the "how do I run
it / what does it cover" cheat sheet.

## Layers

| Layer | Tool | Where | Runs against |
|---|---|---|---|
| Unit | Vitest (`jsdom` project) | pure logic (`lib/`, `store/`) | nothing — no network |
| Integration | Vitest (`node` + `jsdom` projects) | auth/BFF, feature services/hooks, page components | msw-mocked `/api/backend/*` |
| E2E | Playwright | `e2e/` | the real running stack (Mongo + Keycloak + backend + frontend) |

Tests live **next to the code** as `*.test.ts(x)` (not `.spec.ts` — that suffix
is reserved for the backend's Jest convention, so the two never collide).
Shared test infra lives in `test/`.

## Running tests

```bash
pnpm test              # full suite, both Vitest projects, once
pnpm test:watch         # watch mode
pnpm test:coverage      # full suite + coverage report
pnpm typecheck          # tsc --noEmit — test files are type-checked too
```

Run a subset with normal Vitest filters, e.g.:

```bash
pnpm test -- src/features/leads
pnpm test -- -t "invalidates"
```

### E2E

Needs the full stack running first: Mongo, Keycloak, `crm-backend` (:5000),
`crm-frontend` (:3001).

```bash
npx playwright install chromium   # once
pnpm test:e2e
pnpm test:e2e:ui                  # interactive runner
```

See [e2e/README.md](e2e/README.md) for fixture/role details. A `global.setup`
project signs in once per role (admin/staff/customer) via the real Keycloak
form and reuses `storageState` across specs — only `auth.spec.ts` exercises
the actual OIDC redirect.

## Coverage

`pnpm test:coverage` writes an HTML report to `coverage/index.html` (also
`text` summary in the terminal and `lcov.info` if you want to feed another
tool). There is **no coverage gate** — reports are for review, not CI, since
this project intentionally has no CI pipeline for tests yet.

Excluded from coverage on purpose (see `vitest.config.ts`): `*.test.*`,
`types.ts` files, `components/ui/**` (generated shadcn primitives), and
`app/**/layout.tsx` / `app/**/page.tsx` (thin route wrappers — the real UI
they render, under `crm-pages/`, *is* covered).

## What's covered, by area

- **`lib/`, `store/`** — `api-client` request shaping/error handling,
  `currency` formatting, `cn()`, the Zustand UI store.
- **`lib/auth/*`, `app/api/**`, `proxy.ts`** (Vitest `node` project) — session
  cookie seal/unseal + chunking, token refresh, OIDC URL building, every auth
  route handler, and the `/api/backend/[...path]` proxy (verb forwarding,
  bearer injection, no token leaking to the browser response).
- **`features/*/services`, `features/*/hooks`** — every service method's
  HTTP contract (verb/URL/query/body) via msw, and every hook's
  loading/error/success states plus which query keys each mutation
  invalidates.
- **`crm-pages/*`, shared components** (`Header`, `Sidebar`, `ThemeToggle`) —
  rendered as real components with feature hooks exercised through mocked
  network (msw), not mocked at the module boundary: loading/empty/error
  states, filters, create/edit/delete dialogs (including inline zod
  validation), and role-based UI gating.
- **E2E** — auth redirect + login/logout, lead capture → conversion, ticket
  lifecycle (staff + customer portal), accounts/contacts linkage, and a
  smoke pass over every `(crm)` route.

## Conventions when adding tests

- Mock the **network** (msw), not modules — except page-component tests,
  which mock the page's feature hook(s) directly and drive `useAuth()` via
  `test/utils/renderWithProviders.tsx`'s `auth` override.
- One `QueryClient` per test (`retry: false`, `gcTime: 0`) — never share one
  across tests.
- `onUnhandledRequest: "error"` is set globally — an unmocked request fails
  the test loudly instead of hanging.
- Prefer `findBy*`/`waitFor` over manual timeouts; prefer `user-event` over
  `fireEvent` — except Radix submenu items, which `fireEvent.click` directly
  (see comments in `OpportunitiesPage.test.tsx`) since `user-event`'s
  realistic pointer sequence closes the submenu before the click registers.
- Known accessibility gap some page tests work around: several forms use
  `<label>` + `<Input>` as unassociated siblings (no `htmlFor`/`id`), so
  `getByLabelText` can't resolve them — use `test/utils/fields.ts`'s
  `fieldByLabel()` for those, and prefer real `getByLabelText` wherever a
  form is correctly wired.
