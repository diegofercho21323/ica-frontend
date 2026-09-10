# Tasks: Visual Shell Base (shell-only)

## Review Workload Forecast

| Estimated changed lines | ~250-350 authored |
| 400-line budget risk | Low (800-budget: Low) |
| Chained PRs recommended | No |
| Suggested split | Single PR on `feat/screens-v2-1b-shell` |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: RED (failing RTL first, `npm run test:run`)

- [x] 1.1 RED overlap: heading bbox below sticky header at 390/768/1440 + no x-overflow in `tests/` shell RTL.
- [x] 1.2 RED tokens: accent `#6600FF`, light surfaces, radius ~12px, Manrope stack resolve from `src/app/theme.ts` (no literals in `src/shared/ui/layout/AppShell.tsx`).
- [x] 1.3 RED rail+active: exactly one `aria-current="page"` + `selectedKeys` for `/bodegas` on rail (≥lg) in `src/shared/ui/layout/AppShell.tsx`.
- [x] 1.4 RED drawer: structure (title, nav group, labeled close via `t()`) + close-on-navigate + focus return to trigger (<lg).

## Phase 2: GREEN (minimal shell hunks)

- [x] 2.1 GREEN overlap: sticky `Header` + `Content` top-padding in `src/shared/ui/layout/AppShell.tsx`; touch `src/pages/screens.tsx` padding only.
- [x] 2.2 GREEN tokens: values in `src/app/tokens.ts`, map-only in `src/app/theme.ts`.
- [x] 2.3 GREEN rail+active: `useLocation` → key, `Menu selectedKeys`, `aria-current` on active `Link`; rail `width=80`, `breakpoint="lg"`.
- [x] 2.4 GREEN drawer: `Drawer title + extra close`, grouped `Menu`, keep existing close/focus effect.

## Phase 3: Verify

- [x] 3.1 RTL green `npm run test:run` (overlap, tokens, active, drawer, Space-key nav).
- [x] 3.2 Shots 390/768/1440 reviewed, no overlap; 1b asserts green (snapshot update same unit if tokens shift).

## Phase 4: Corrective re-run visual-shell-fix (gatekeeper, 2026-09-07)

- [x] 4.1 RED: structure (Sider+Content share inner Layout), rail full labels, zero-trigger-below-lg, light `Layout` component tokens in `tests/visual-shell.test.tsx` → exit 1, 4 failed / 3 passed.
- [x] 4.2 GREEN: nested `<Layout hasSider>`, Sider `width 200 + trigger null + theme light`, full inline Menu, `components.Layout` map-only tokens in `src/app/theme.ts` → 31/31 exit 0; typecheck/lint/prettier/build green; Playwright 1440/390 shots show light header, no overlap.
