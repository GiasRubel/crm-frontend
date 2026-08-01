# End-to-end tests

These run a real browser against the **whole stack**, not mocks:

| Piece | Where |
|---|---|
| MongoDB | as configured for `crm-backend` |
| Keycloak | `KEYCLOAK_ISSUER`, realm `crm` |
| `crm-backend` | `http://localhost:5000` |
| `crm-frontend` | `http://localhost:3001` |

Unit and integration tests (`pnpm test`) need none of this — they mock the
network with msw. Only this pack needs the stack up.

## Seed users

Three Keycloak users must exist, one per app role. Point the suite at them with
environment variables (defaults in `e2e/fixtures/roles.ts`):

```bash
E2E_ADMIN_USER=admin@example.com      E2E_ADMIN_PASSWORD=...
E2E_STAFF_USER=rep@example.com        E2E_STAFF_PASSWORD=...
E2E_CUSTOMER_USER=customer@example.com E2E_CUSTOMER_PASSWORD=...
```

The `customer` user must be an `AppRole.Customer` so the portal branch of
`/tickets` is exercised.

## Running

```bash
pnpm exec playwright install chromium   # first time only
pnpm test:e2e
pnpm test:e2e:ui                        # interactive
```

`global.setup.ts` signs each role in through the real Keycloak form once and
writes `e2e/.auth/<role>.json`; the specs reuse that storage state, so only
`auth.spec.ts` pays for the OIDC redirect. `e2e/.auth/` is git-ignored — it
holds live session cookies.

## Conventions

- Specs seed their own records with `unique()` names and clean up after
  themselves, so a run is idempotent and safe to repeat.
- Prefer role/label queries over `data-testid`.
- A spec that needs seed data it cannot create calls `test.skip(...)` with a
  reason rather than failing — a missing fixture is not a regression.
