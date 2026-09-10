# Proposal: Frontend Dashboard KPIs

## Intent

Dashboard shows placeholder copy; operators need at-a-glance count progress. Derive 4 KPIs from existing `getOperatorLines` mock (5 deterministic SKU lines) via state selectors — no new endpoint.

## Scope

### In Scope
- 4 Spanish `t()` KPI cards: total SKUs, contadas, pendientes, avance %
- `features/dashboard/` slice + `shared` KpiCard primitive (AntD Card+Statistic)
- Responsive grid 1→2→4 cols; 390px stacks vertically, no overflow
- Exact-decimal strings, never coerced to float
- Update placeholder-copy smoke asserts to new content

### Out of Scope
- Charts, Cantidad/Volumen/Peso toggles, filters row, breadcrumb search
- Warehouse cards (`listScopes=[]`; needs new fixture)
- Real backend

## Capabilities

### New Capabilities
- `dashboard-kpis`: KPI cards derived from operator lines with progress selectors

### Modified Capabilities
- None (visual-shell covers shell only; KPI content explicitly out of scope there)

## Approach

Thin `DashboardPage` composes `features/dashboard/` slice; selectors compute counts/% from `getOperatorLines`; KpiCard primitive renders AntD Statistic; STRICT TDD (`npm run test:run`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/screens.tsx` | Modified | Wire DashboardPage slice |
| `src/features/dashboard/` | New | Slice + selectors |
| `src/shared/ui/primitives/` | Modified | KpiCard primitive |
| `src/app/i18n/` | Modified | Spanish KPI strings |
| `tests/` | Modified | Update smoke asserts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selector float coercion | Med | String-decimal helpers + number-input lint ban |
| Scope creep (charts/filters) | Low | Explicit out-of-scope list |

## Rollback Plan

Revert single PR (branch `feat/dashboard-kpis`); placeholder asserts restore with it — no migration or backend state.

## Dependencies

- Existing `getOperatorLines` mock; AntD 5, i18next

## Success Criteria

- [ ] 4 cards render correct values from 5-line fixture
- [ ] 390px viewport stacks cards 1-col, no overflow
- [ ] `lint`, `typecheck`, `fsd`, `test:run` pass
