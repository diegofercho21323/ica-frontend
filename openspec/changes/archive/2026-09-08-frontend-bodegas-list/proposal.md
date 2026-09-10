# Proposal: frontend-bodegas-list

## Intent

`/bodegas` route + nav exist but render a `PlaceholderPage` backed by `listScopes()` returning `[]`. Provide the missing list flow (loading / items / empty / error) over deterministic mock scopes.

## Scope

### In Scope
- `src/features/bodegas/BodegasList.tsx` (React Query `['scopes']` vs `mockInventoryApi.listScopes`), AntD `List`/`Card`, `aria-busy` loading, `Alert role="alert"` error
- Deterministic scope fixtures in `src/shared/api/inventory/fixtures.ts` + `mock.ts`
- `src/pages/screens.tsx`: replace `BodegasPage` placeholder body with `<BodegasList />`
- `es.json` keys: list title, count, error; reuse `emptyWarehouses`
- Co-located `BodegasList.test.tsx` (strict TDD RED: empty + populated)

### Out of Scope
- Search, filter, sort, pagination, detail view
- Capture-entry / finalize flows; HTTP adapter enablement
- Mock-contract validator (deferred follow-up); generic Table primitive

## Capabilities

### New Capabilities
- `bodegas-list`: bodega scope listing (loading/items/empty/error) on protected `/bodegas`

### Modified Capabilities
- None

## Approach

Mock-first mirror of `features/dashboard/DashboardKpis.tsx`: `useQuery` against mock port, presentational AntD `List`/`Card`, `t()` for all copy, `Row/Col` responsive grid. Overrides frontend-design Table gate: no `<Table>` primitive exists — do NOT create one here. Fixture shape: `InventoryScope { id, name }` as-is; optional `code` extension is a spec-phase decision, not a blocker.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/bodegas/` | New | Slice + tests; imports only from `shared/`, `app/` |
| `src/pages/screens.tsx` | Modified | Wire `<BodegasList />` into `BodegasPage` |
| `src/shared/api/inventory/mock.ts`, `fixtures.ts` | Modified | Deterministic scopes instead of `[]` |
| `src/app/i18n/es.json` | Modified | New keys under `app.*` |
| `src/shared/ui/primitives/` | Untouched | Reuse AntD directly; no new primitive |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplication with deferred screens-v2 task 1d | Med | Declare this change as execution of 1d scope |
| Fixture shape drift vs future real API | Low | Keep `InventoryScope` contract; sync pass later |
| Scope creep (search/detail/validator) | Med | Reject in spec review; single-PR budget |

## Rollback Plan

Revert single PR: restore `screens.tsx` placeholder, `mock.ts` `[]`, drop `src/features/bodegas/` + `es.json` keys. No migration, no backend state.

## Dependencies

- None. Declares execution of deferred `frontend-screens-v2` task 1d.

## Success Criteria

- [ ] `/bodegas` renders fixture items when populated, `emptyWarehouses` when `[]`
- [ ] Loading (`aria-busy`) and error (`role="alert"`) states covered by tests
- [ ] `npm run test:run` green; no hardcoded strings; single PR within budget
