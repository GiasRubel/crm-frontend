# CRM Frontend — AGENT.md

Next.js 16 (App Router) dashboard for the CRM. Talks to the NestJS API in
`../crm-backend` through a same-origin BFF proxy. The Next.js server — not the
browser — owns the Keycloak OIDC flow; see "Data fetching & auth" below.

## Stack

- **Next.js 16** App Router, **React 19**, TypeScript (strict).
- **Tailwind CSS v4** (`@tailwindcss/postcss`) + **shadcn/ui** (Radix primitives in
  `components/ui/`, config in `components.json`, `new-york` style). Icons: `lucide-react`.
- **TanStack Query v5** for server state; **Zustand** for UI state.
- **react-hook-form** + **zod** (`@hookform/resolvers`) for forms.
- **openid-client** + **iron-session** for server-side OIDC (Authorization Code
  + PKCE) and the encrypted httpOnly session cookie — see "Data fetching & auth".
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
server after changing env. All auth/backend vars are **server-only** (no
`NEXT_PUBLIC_` prefix — the browser never needs them): `APP_BASE_URL`,
`BACKEND_INTERNAL_URL` (→ `http://localhost:5000`), `KEYCLOAK_ISSUER`,
`KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`,
`SESSION_SECRET`. See `../crm-backend/KEYCLOAK-SETUP.md` §1D/3B for how to
provision `KEYCLOAK_CLIENT_SECRET` (the `crm-frontend` Keycloak client is a
confidential client, not a public/PKCE-only SPA client).

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
  lib/                    # api-client.ts, utils.ts (cn helper), currency.ts
    auth/                 # oidc.ts, session.ts, token.ts — server-only BFF helpers
  store/                  # Zustand stores (useUiStore)
  proxy.ts                # gates (crm) routes on the session cookie (Next's
                           # successor to middleware.ts — same mechanism)
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

### Data fetching & auth (BFF — the browser never holds a token)

This app is its own Backend-for-Frontend: the Next.js **server** runs the full
OIDC Authorization Code + PKCE flow against Keycloak and keeps the access/refresh
token in an httpOnly, encrypted session cookie (`iron-session`, sealed in
`lib/auth/session.ts`) — client-side JS never sees a bearer token, and the
browser never talks to the NestJS backend or Keycloak directly.

- **All HTTP goes through `lib/api-client.ts`** (`apiClient.get/post/put/patch/delete`).
  It calls same-origin `/api/backend/*` — no token attachment needed client-side,
  the session cookie rides along automatically. It throws `ApiError(status,
  message)` on non-2xx. Don't call `fetch` directly.
- **`app/api/backend/[...path]/route.ts`** is the proxy: it reads the session
  cookie server-side (refreshing the access token first if it's near expiry, via
  `lib/auth/token.ts`), forwards the request to `BACKEND_INTERNAL_URL` with a real
  `Authorization: Bearer` header, and streams the response back. This is the only
  place a token exists outside the sealed cookie.
- **`app/api/auth/{login,callback,logout,session}/route.ts`** implement the OIDC
  flow: `login` builds the authorization URL (PKCE, optional `idpHint=google|
  facebook`, `register=true` for Keycloak's registration form) and stashes the
  PKCE verifier + `state` in a short-lived cookie; `callback` exchanges the code
  and seals the session cookie; `logout` clears it and redirects through
  Keycloak's RP-initiated end-session endpoint; `session` returns
  `{ authenticated, user, deploymentMode }` — the only "auth state" the browser
  ever fetches.
- **`src/proxy.ts`** (Next's successor to `middleware.ts`) gates every `(crm)`
  route: it resolves the session cookie — refreshing it if near expiry — before
  the page renders, and redirects to `/api/auth/login` if there's no valid
  session. This replaced the old client-side `keycloak-js` `check-sso` iframe
  dance; there's no client round-trip needed to know if the user is logged in.
- **Auth lives in `providers/keycloak-provider.tsx`.** Consume it with
  `useAuth()` → `{ authenticated, isLoading, user, deploymentMode, login,
  register, loginWithProvider, logout }`. On mount it fetches `GET
  /api/auth/session` once. `user.role` drives role-based UI; `user.keycloakId`
  is the Keycloak subject id (needed anywhere code used to read
  `keycloak.subject`, e.g. "assigned to me" filters — see `ActivitiesPage.tsx`).
- **Route protection** is layered: `proxy.ts` is the real gate (see above).
  `app/(crm)/layout.tsx` additionally waits for `isLoading` (fetching the
  profile) and renders the Sidebar/Header shell once ready — it no longer
  redirects unauthenticated users itself. New authenticated pages just go under
  `(crm)/` and inherit both.

### State

- **Server state → TanStack Query** (via feature hooks). Provider in
  `providers/query-client-provider.tsx`.
- **UI state → Zustand** (`store/useUiStore.ts`, e.g. `sidebarOpen`). Keep stores
  small and UI-only; don't cache server data here.

## Conventions

- Use the `@/*` path alias (→ `src/`). Import UI primitives from `@/components/ui/*`.
- **UI primitives: Always use shadcn/ui components.** Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) to compose Tailwind classes cleanly. Do not hand-roll custom components when a shadcn equivalent exists.
- Client components that use hooks/browser APIs need `"use client"`. Keep it off
  route wrappers that don't need it.
- Types: mirror backend response DTOs in the feature's `types.ts`.


## Gotchas

- Frontend **must** run on port 3001 — backend CORS + Keycloak redirect URIs
  assume that origin.
- **The `crm-frontend` Keycloak client is confidential, not public/PKCE-only.**
  If you re-provision Keycloak from a stale realm export, you must re-apply the
  BFF client settings by hand — see `../crm-backend/KEYCLOAK-SETUP.md` §1D
  (Client Authentication: On, callback redirect URI
  `http://localhost:3001/api/auth/callback`, post-logout redirect URI).
- **All backend/auth calls go through `/api/backend/*` and `/api/auth/*`.**
  `apiClient` (and the browser generally) never calls `BACKEND_INTERNAL_URL` or
  Keycloak directly — only the Route Handlers under `app/api/` do, server-side.
  CRM endpoints still use backend root paths (`/users`, `/customers`, …) behind
  the `/api/backend` prefix — no double `/api`. Don't call `fetch` directly from
  client components; keep all HTTP in `apiClient`.
- **Environment variables are server-only now.** `KEYCLOAK_ISSUER`,
  `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `SESSION_SECRET`,
  `APP_BASE_URL`, `BACKEND_INTERNAL_URL` are all read only in server code
  (`lib/auth/*`, `app/api/auth/*`, `proxy.ts`) — never expose them as
  `NEXT_PUBLIC_*`, that would defeat the point of the BFF. Use `.env.example` as
  the checklist for new clones, CI, and production; `SESSION_SECRET` needs a
  random 32+ byte value (`openssl rand -hex 32`).
- **`proxy.ts` always runs on the Node.js runtime** (Next.js 16's replacement for
  `middleware.ts`) — it cannot declare `export const runtime`, that's now an
  error. This is required here since `openid-client`/`iron-session` token
  refresh runs inside it.
- **Session cookies are chunked** (`crm_session.0`, `crm_session.1`, …). Browsers
  silently drop any single cookie over ~4 KB, and a sealed Keycloak token pair is
  close to that — writing the session as one cookie causes a login redirect loop
  with no error anywhere. Always read/write it via the helpers in
  `lib/auth/session.ts`, never `cookies().set("crm_session", …)` directly.
