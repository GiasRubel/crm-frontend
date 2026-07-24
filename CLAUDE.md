# CRM Frontend — CLAUDE.md

Next.js 16 (App Router) dashboard for the CRM. Talks to the NestJS API in
`../crm-backend` and authenticates users against Keycloak on the client.

## Stack

- **Next.js 16** App Router, **React 19**, TypeScript (strict).
- **Tailwind CSS v4** (`@tailwindcss/postcss`) + **shadcn/ui** (Radix primitives in
  `components/ui/`, config in `components.json`, `new-york` style). Icons: `lucide-react`.
- **TanStack Query v5** for server state; **Zustand** for UI state.
- **react-hook-form** + **zod** (`@hookform/resolvers`) for forms.
- **keycloak-js** for OIDC (PKCE) auth on the client.
- **recharts** for dashboard charts.

## Commands (package manager: pnpm — `pnpm-lock.yaml` is committed)

```bash
pnpm dev        # next dev -p 3001
pnpm build      # next build
pnpm start      # next start -p 3001
pnpm lint       # eslint
```

Runs on **port 3001** (the backend expects this origin for CORS). Copy
`.env.example` → `.env` (or `.env.local`) before first run; restart the dev
server after changing env. All browser-exposed vars are `NEXT_PUBLIC_*`:
`NEXT_PUBLIC_API_BASE_URL` (→ `http://localhost:5000`), `NEXT_PUBLIC_KEYCLOAK_URL`,
`NEXT_PUBLIC_KEYCLOAK_REALM`, `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID`.

## Architecture

```
src/
  app/                    # App Router — routes are thin wrappers only
    layout.tsx            # root: wraps everything in <Providers>
    (crm)/                # authenticated app (route group)
      layout.tsx          # auth gate + Sidebar/Header shell
      dashboard|customers|leads|opportunities|tickets|activities|reports|users/page.tsx
    auth/                 # login | register | forgot-password | otp-verify
  crm-pages/              # the actual page UIs (Dashboard.tsx, LeadsPage.tsx, …)
  components/             # shared components (Header, Sidebar, *Card)
    ui/                   # shadcn/ui primitives — generated, edit sparingly
  features/               # feature slices (see pattern below)
    leads/{types.ts, services/leadApi.ts, hooks/useLeads.ts}
  providers/              # KeycloakProvider, QueryClientProvider, index.tsx
  lib/                    # api-client.ts, keycloak.ts, utils.ts (cn helper)
  store/                  # Zustand stores (useUiStore)
```

### Route → page split (follow this)

App Router files under `app/` are **thin wrappers** — a route `page.tsx` just
renders the matching component from `crm-pages/` (e.g.
`app/(crm)/leads/page.tsx` → `<LeadsPage />` from `crm-pages/LeadsPage.tsx`). Put
real UI in `crm-pages/`, not in the route file. Route files can be Server
Components; interactive pages are `"use client"`.

### Feature-slice pattern (follow this for new domains)

Group a domain under `features/<name>/`:
- `types.ts` — the domain model + `Create<X>Dto`.
- `services/<x>Api.ts` — thin object of `apiClient` calls (`getAll`, `getById`,
  `create`, `update`, `delete`). No fetch logic beyond `apiClient`.
- `hooks/use<X>.ts` — a hook wrapping `useQuery`/`useMutation`, keyed by
  `["<name>"]`, invalidating that key on mutation success.

`customers/` is the reference implementation. Copy its shape for tickets,
etc. `customers/`, `teams/`, `leads/`, `opportunities/`, `accounts/`,
`contacts/`, and `activities/` are fully wired to the backend (`users/`
exposes the staff directory for pickers). Tasks/communication-log rules live
in `../ACTIVITIES-AND-ENGAGEMENT-BUSINESS.md`; `apiClient.getBlob` handles
non-JSON downloads (e.g. `.ics` calendar exports). `automations/` +
`/automations` (admin-only UI) configure the backend rule engine — business
rules in `../AUTOMATION-AND-WORKFLOWS-BUSINESS.md`. `tickets/` + `kb/` are
the helpdesk (`/tickets` renders a customer-portal view for
`AppRole.Customer`, staff helpdesk otherwise; `/kb` is the wiki editor;
`/faq` outside `(crm)` is the public help center) — rules in
`../SERVICE-AND-SUPPORT-BUSINESS.md`. `reports/` + `/reports` is the
Reporting & Analytics module (dashboards built on **recharts** + a custom
report builder over all domains) — see `../REPORTING-AND-ANALYTICS-DEVELOPER.md`. Teams and record assignment business rules
live in `../TEAMS-AND-TERRITORIES.md`; lead capture/scoring/conversion and the
pipeline Kanban rules live in `../LEADS-AND-PIPELINE-BUSINESS.md`; company
(account) profiles, person (contact) records, interactions, and preferences
live in `../CONTACTS-AND-ACCOUNTS-BUSINESS.md` (+ `-DEVELOPER.md` each).
`/capture` (outside the `(crm)` group) is a public lead-capture form posting
to the unauthenticated `POST /leads/capture`.

### Data fetching & auth

- **All HTTP goes through `lib/api-client.ts`** (`apiClient.get/post/put/patch/delete`).
  It prefixes `NEXT_PUBLIC_API_BASE_URL`, sets JSON headers, and — client-side —
  attaches the Keycloak bearer token, refreshing it (`updateToken(30)`) before each
  request. It throws `ApiError(status, message)` on non-2xx. Don't call `fetch`
  directly.
- **Auth lives in `providers/keycloak-provider.tsx`.** Consume it with
  `useAuth()` → `{ authenticated, isLoading, user, token, login, register,
  loginWithProvider, logout, getToken }`. Keycloak is initialized once
  (`check-sso`, PKCE `S256`); on success the provider loads the app profile from
  `GET /users/me`. `user.role` drives role-based UI.
- **Route protection** is done in `app/(crm)/layout.tsx`: it waits for
  `isLoading`, redirects to `/auth/login` when unauthenticated, and renders the
  Sidebar/Header shell otherwise. New authenticated pages just go under `(crm)/`
  and inherit this gate.

### State

- **Server state → TanStack Query** (via feature hooks). Provider in
  `providers/query-client-provider.tsx`.
- **UI state → Zustand** (`store/useUiStore.ts`, e.g. `sidebarOpen`). Keep stores
  small and UI-only; don't cache server data here.

## Conventions

- Use the `@/*` path alias (→ `src/`). Import UI primitives from `@/components/ui/*`.
- Compose class names with `cn()` from `lib/utils.ts` (clsx + tailwind-merge).
- Add new UI primitives via shadcn rather than hand-rolling; keep `components/ui/`
  close to generated output.
- Client components that use hooks/browser APIs need `"use client"`. Keep it off
  route wrappers that don't need it.
- Types: mirror backend response DTOs in the feature's `types.ts`.

## Gotchas

- Frontend **must** run on port 3001 — backend CORS + Keycloak redirect URIs
  assume that origin.
- **Direct API calls (intentional).** `next.config.ts` rewrites `/api/*`,
  `/files/*`, and `/swagger/*` to the backend for same-origin requests, but
  `apiClient` bypasses those rewrites: it calls `NEXT_PUBLIC_API_BASE_URL`
  directly (e.g. `http://localhost:5000/users/me`). CRM endpoints use backend
  root paths (`/users`, `/customers`, …) — no `/api` prefix. Don't call `fetch`
  directly; keep all HTTP in `apiClient`.
- **Environment variables.** Keycloak settings (`NEXT_PUBLIC_KEYCLOAK_URL`,
  `NEXT_PUBLIC_KEYCLOAK_REALM`, `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID`) are required —
  `lib/keycloak.ts` passes them with `!`, so missing values break auth at runtime.
  `NEXT_PUBLIC_API_BASE_URL` is optional locally: `api-client.ts` falls back to
  `http://localhost:5000`. Use `.env.example` as the checklist for new clones, CI,
  and production.
- `keycloak.init` is guarded by a module-level `initPromise` so it runs once even
  under React strict-mode double-mounts — don't add a second init.
