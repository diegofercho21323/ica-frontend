# Exploration: frontend-bodegas-list

## Current State

- `GET /bodegas` route exists under `RequireAuth` (`src/app/router.tsx`) and renders `BodegasPage` (`src/pages/screens.tsx`), which is a `PlaceholderPage` showing `t('app.emptyWarehouses')` ("No hay bodegas disponibles para esta demo.").
- Nav wiring is done: `AppShell.tsx` maps `/bodegas` to menu key `warehouses` with label `t('app.warehouses')` ("Bodegas").
- The data contract exists but is hollow: `InventoryApiPort.listScopes(): Promise<InventoryScope[]>` (`src/shared/api/inventory/port.ts`) with `InventoryScope = { id, name }` (`models.ts`), while `mockInventoryApi.listScopes()` returns `[]` (`mock.ts`) and the HTTP adapter is intentionally disabled for the local demo (`http.ts`).
- There is NO `src/features/bodegas/` slice, NO bodegas spec under `openspec/specs/` (only access, app-shell, dashboard-kpis, public-routes, visual-shell), and NO `<Table>` primitive in `src/shared/ui/primitives/` (only `KpiCard`, `HomeShell`).
- Established feature pattern to mirror: `features/dashboard/DashboardKpis.tsx` — `useQuery` from `@tanstack/react-query` against `mockInventoryApi`, `aria-busy` loading skeleton, presentational primitives fed with exact-decimal strings, `t()` for all copy, `Row/Col` responsive grid, co-located `selectors.ts` + `*.test.tsx` (strict TDD, `npm run test:run`).
- Overlap alert: `frontend-screens-v2` Phase 4 task `1d` ("Dashboard/Bodegas deterministic mocks") is DEFERRED and covers the same ground — this change is the concrete execution of that deferred scope.

## Affected Areas

- `src/features/bodegas/*` (NEW) — `BodegasList.tsx` (+ optional `selectors.ts`, `BodegasList.test.tsx`); FSD slice boundary, imports only from `shared/` and `app/`
- `src/pages/screens.tsx` — replace `BodegasPage` placeholder body with `<BodegasList />`
- `src/shared/api/inventory/mock.ts` + `fixtures.ts` — `listScopes()` returns deterministic scope fixtures instead of `[]`
- `src/app/i18n/es.json` — new keys (list title, empty state reuse/extension, error state, item count)
- `src/shared/ui/primitives/` — reuse `Card`/`List` from AntD directly; do NOT grow a generic Table primitive inside this change
- `openspec/specs/` (downstream) — new `bodegas-list` spec comes in sdd-spec, not here

## Approaches

1. **Mock-first list mirroring DashboardKpis** — new `features/bodegas/BodegasList.tsx` with `useQuery({ queryKey: ['scopes'], queryFn: mockInventoryApi.listScopes })`, AntD `List`/`Card` rendering, `aria-busy` loading state, existing `emptyWarehouses` copy for the empty state, error `Alert role="alert"`.
   - Pros: consistent with dashboard/access patterns; strict-TDD RED is trivial (assert list items from fixture); zero backend dependency; HTTP adapter stays disabled per demo strategy; smallest review footprint
   - Cons: fixture data will need a contract-sync pass when the real API lands
   - Effort: Low

2. **Real API via HTTP adapter now** — enable `listScopes` GET in `http.ts` with auth/token handling.
   - Pros: production-real data path
   - Cons: no backend contract exists; breaks the intentional local-demo posture; requires auth-token design that belongs to access follow-ups; highest risk of scope creep into capture/finalize flows
   - Effort: High

3. **Mock port + contract validator (screens-v2 1d/2a direction)** — Approach 1 plus a mock-contract validator so the later HTTP swap is drop-in.
   - Pros: aligns with the deferred 1d/2a plan; de-risks the future HTTP parity change
   - Cons: no validator infra exists yet in the repo; adds upfront design surface that proposal/spec should bound first
   - Effort: Medium

## Recommendation

Approach 1 (mock-first, DashboardKpis mirror). It confirms the user's gap ("creo que nos falta bodegas": route + nav exist, list flow does not), fits the FSD/React-Query/AntD conventions already proven in-tree, keeps the change inside the 400-line review budget as a single PR, and leaves Approach 3's validator to a follow-up once the bodegas contract stabilises. Scope is strictly list (loading / items / empty / error); search, detail, and capture-entry are out.

## Risks

- Overlap with deferred `frontend-screens-v2` task 1d — proposal must declare this change as the execution of that scope to avoid double implementation.
- `mock.listScopes()` returning `[]` today means the empty state IS the current behaviour; fixture shape (`id`, `name`, plus any demo fields like location/count) needs a product decision in proposal.
- No `<Table>` primitive exists despite the frontend-design skill referencing one — do not smuggle a generic table into this change; use AntD `List`/`Card`.
- i18n: all new copy needs `es.json` keys under `t()`; no hardcoded strings.

## Ready for Proposal

Yes — gap confirmed (placeholder page + empty mock, no feature slice, no spec). Orchestrator can tell the user: "/bodegas route and nav exist but render a placeholder backed by an empty mock; the list flow (loading/items/empty/error over deterministic mock scopes) is missing and scoped as `frontend-bodegas-list`, mirroring the dashboard pattern."
