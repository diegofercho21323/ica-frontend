# Design: Frontend Dashboard KPIs

## Technical Approach

Thin `DashboardPage` composes a new `features/dashboard/` slice. Pure selectors derive 4 KPI strings from `getOperatorLines` (5-line fixture); shared `KpiCard` primitive (AntD Card+Statistic) renders them. STRICT TDD: RED selector + RTL card tests first (`npm run test:run`).

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Selectors over `OperatorV2LineView[]` in slice vs inline in page | Inline is shorter but untestable, leaks logic into composition | Pure `selectKpis(lines)` + granular selectors in `features/dashboard/selectors.ts` |
| Contada = `COUNTED` + `COUNTED_ZERO`; pendiente = `NOT_COUNTED` + `NOT_FOUND` | `NOT_FOUND` could read as terminal, but it carries no quantity (fixture comment) so progress-wise it is pending | Adopt this partition; document in selector JSDoc |
| Avance via integer math on counts only (`counted*100/total`, truncating remainder; empty → `"0"`) | Never touches `currentQuantity` strings, so `9007199254740993.000001` cannot corrupt; remainder truncation is explicit | Adopt; ban `Number()`/`parseFloat` on quantity strings in slice |
| `KpiCard` in `shared/ui/primitives/` vs inside slice | Slice-local card is faster but violates FSD primitive rule | Shared primitive, presentational props only |
| Data via React Query `useQuery(['operator-lines'])` in slice | Direct mock call is simpler but breaks server-state convention | React Query; loading → `aria-busy` skeleton cards |

## Data Flow

```
mockInventoryApi.getOperatorLines() ──→ useQuery ──→ selectKpis(lines) ──→ KpiCard ×4
     (OperatorV2LineView[])              (slice)        (pure, string out)     (primitive)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/dashboard/selectors.ts` | Create | Pure selectors → exact-decimal strings |
| `src/features/dashboard/selectors.test.ts` | Create | RED: fixture values, recompute, decimal-safety |
| `src/features/dashboard/DashboardKpis.tsx` | Create | Query + grid section of 4 KpiCards |
| `src/features/dashboard/DashboardKpis.test.tsx` | Create | RED RTL: cards render `5/3/2/60` from fixture |
| `src/shared/ui/primitives/KpiCard.tsx` | Create | `{label,value,unit?,loading?}` → Card+Statistic |
| `src/pages/screens.tsx` | Modify | DashboardPage renders title + slice (drop placeholder) |
| `src/app/i18n/es.json` | Modify | `app.kpiTotal/kpiCounted/kpiPending/kpiProgress` labels |
| `tests/app.smoke.test.tsx` | Modify | Assert KPI content, no `dashboardPlaceholder` |

## Interfaces / Contracts

```ts
// selectors.ts — all outputs exact-decimal strings, never number
export type KpiValues = { total: string; counted: string; pending: string; progress: string };
export function selectKpis(lines: readonly OperatorV2LineView[]): KpiValues;
// KpiCard.tsx — presentational only, no hooks/fetch/selectors
export function KpiCard(p: { label: string; value: string; unit?: string; loading?: boolean }): JSX.Element;
```

Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` in `<section>`; `t()` for all labels; `%` suffix literal.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | selectors: `5/3/2/60`, recompute on state flip, decimal strings untouched, empty → zeros | Vitest RED first |
| Integration (RTL) | slice renders 4 Statistics with exact values; loading `aria-busy` | RTL + mocked query |
| E2E/smoke | dashboard shows KPIs, 390px 1-col no overflow, no placeholder copy | Update smoke asserts |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Single PR on `feat/dashboard-kpis` (est. <200 lines, within 800 budget). Rollback: revert PR; placeholder copy + asserts restore with it.

## Open Questions

- None blocking. Remainder rule (truncate vs round) confirmed as truncate for v1.
