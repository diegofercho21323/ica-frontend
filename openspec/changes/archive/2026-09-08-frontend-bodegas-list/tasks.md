# Tasks: Bodegas Scope List

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Bodegas list flow (fixtures+mock+i18n+component+wiring) | PR 1 (single) | `npm run test:run -- BodegasList` | `npm run dev` → `/bodegas` shows 3 cards | Revert PR: restore placeholder, `[]`, drop slice/keys |

## Phase 1: RED — Failing Tests

- [x] 1.1 Create `src/features/bodegas/BodegasList.test.tsx` with failing cases for pending (`aria-busy`), populated (3 cards), empty (`emptyWarehouses`), error (`role="alert"`); mirror `DashboardKpis.test.tsx` providers (`QueryClient(retry:false)`, mocked `listScopes`)
- [x] 1.2 Run `npm run test:run -- BodegasList`; confirm RED (suite fails: component missing)

## Phase 2: GREEN — Data Foundation

- [x] 2.1 Add `scopeFixtures` (3 rows `{id,name}`, no `code`) to `src/shared/api/inventory/fixtures.ts`
- [x] 2.2 Return fixture copies (`map(s => ({...s}))`) from `listScopes()` in `src/shared/api/inventory/mock.ts` instead of `[]`
- [x] 2.3 Add `app.warehousesCount` (`{{count}}`) and `app.warehousesError` to `src/app/i18n/es.json`; reuse `app.warehouses`, `app.emptyWarehouses`

## Phase 3: GREEN — Component + Wiring

- [x] 3.1 Create `src/features/bodegas/BodegasList.tsx`: `useQuery({queryKey:['scopes']})` vs `mockInventoryApi.listScopes()`, AntD `List grid={{xs:1,sm:2,lg:3}}` + `Card`, `Alert` on error, `aria-busy` on pending, all copy via `t()`
- [x] 3.2 Run `npm run test:run -- BodegasList`; confirm GREEN (all 4 states pass)
- [x] 3.3 Replace `BodegasPage` placeholder body with `<BodegasList />` in `src/pages/screens.tsx`

## Phase 4: Verification

- [x] 4.1 Run full `npm run test:run`; confirm green, no regressions
- [x] 4.2 Assert no hardcoded strings in `BodegasList.tsx`, no `Table` primitive created, `http.ts` untouched, no search/filter/pagination/detail code
