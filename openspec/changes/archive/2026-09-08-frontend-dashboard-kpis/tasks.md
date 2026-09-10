# Tasks: Frontend Dashboard KPIs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR on `feat/dashboard-kpis` |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Selectors + KpiCard primitive | PR 1 (single) | `npm run test:run src/features/dashboard/selectors.test.ts` | N/A — pure unit, no runtime boundary | `src/features/dashboard/selectors*.ts`, `src/shared/ui/primitives/KpiCard.tsx` removable |
| 2 | Slice + page wiring + i18n + smoke | PR 1 (single) | `npm run test:run tests/app.smoke.test.tsx` | `npm run dev` → dashboard route, 390px 1-col no overflow | `src/features/dashboard/DashboardKpis.*`, `src/pages/screens.tsx`, `src/app/i18n/es.json` revert restores placeholder |

## Phase 1: Selectors (RED→GREEN)

- [x] 1.1 RED: create `src/features/dashboard/selectors.test.ts` — fixture 5/3/2/60, recompute flip, decimal-safety, empty→zeros
- [x] 1.2 GREEN: create `src/features/dashboard/selectors.ts` — `selectKpis()` integer math, string outputs, `Number()` ban

## Phase 2: KpiCard primitive (RED→GREEN)

- [x] 2.1 RED: extend `src/features/dashboard/DashboardKpis.test.tsx` — KpiCard label/value/unit via Statistic
- [x] 2.2 GREEN: create `src/shared/ui/primitives/KpiCard.tsx` — presentational props only, `aria-busy` loading

## Phase 3: Slice + page wiring + i18n (RED→GREEN)

- [x] 3.1 RED: extend `src/features/dashboard/DashboardKpis.test.tsx` — RTL slice renders 4 exact values, loading skeleton
- [x] 3.2 GREEN: create `src/features/dashboard/DashboardKpis.tsx` — `useQuery(['operator-lines'])` + grid `grid-cols-1 sm:2 lg:4`
- [x] 3.3 GREEN: modify `src/pages/screens.tsx` — DashboardPage renders title + slice, drop placeholder
- [x] 3.4 GREEN: modify `src/app/i18n/es.json` — `app.kpiTotal/kpiCounted/kpiPending/kpiProgress` Spanish labels

## Phase 4: Regression + verification

- [x] 4.1 GREEN: modify `tests/app.smoke.test.tsx` — assert KPI content, no `dashboardPlaceholder` remains
- [x] 4.2 Verify: `npm run test:run`, `lint`, `typecheck`, `fsd` pass; 390px stacks 1-col no overflow
