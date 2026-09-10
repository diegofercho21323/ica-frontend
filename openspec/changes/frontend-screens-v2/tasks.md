# Tasks: Frontend Screens v2 — 1b-shell remediation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60–120 (RED ~30–50, GREEN ~10–20, gates/evidence only) |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR: RED → GREEN + gates on feat/screens-v2-1b-shell |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1b-r1 | RED: interaction proof fails first | single PR | `npm run test:run -- app.smoke` (expect FAIL) | N/A — RTL is the runtime proof (no preview server needed) | `tests/app.smoke.test.tsx` hunks only |
| 1b-r2/r3 | GREEN: drawer close + focus restore, all gates green | single PR | `npm run test:run` (exit 0) | `npm run build` + preview GET /login /dashboard /bodegas /capture 200 | Shell-only hunks (`AppShell.tsx` + smoke test); 1a untouched |

Single-PR boundary: revert `AppShell.tsx` + smoke-test hunks only; 1a files, `src/tests/**`, 1c-access and MVP slices out of scope.

## Phase 1: Foundation — DONE (do not reopen)

- [x] 1a Guards/type isolation/blind checks (157 authored lines, untouched)

## Phase 2: PR 1b-shell remediation — DONE (verify FULL PASS 11/11 reqs, 12/12 scen, 2026-09-07; evidence apply-progress #1575 + verify-report 3c70fc8d)

- [x] 1b-r1 RED: extended `tests/app.smoke.test.tsx` with Space + click activation, observed heading/URL change, `waitFor` dialog removal, focus-returns-to-trigger assert, desktop ≥lg no-drawer scenario, exact emptyWarehouses/capturePlaceholder copy; `npm run test:run -- app.smoke` recorded FAIL first
- [x] 1b-r2 GREEN: modified `src/shared/ui/layout/AppShell.tsx` — triggerRef on menu Button + guarded open→closed focus-restore effect; Menu-level onClick close kept; Sider navigation() call unchanged
- [x] 1b-r3 GREEN gates: `npm run test:run`, typecheck, lint, fsd, build all exit 0; ≤800 lines, 1a untouched

## Phase 3: PR 1c-access — DEFERRED (base: remediated 1b)

- [ ] 1c.1 RED: invalid persisted role, wrong demo password, keyboard submit, guarded routes, no persisted password
- [ ] 1c.2 GREEN: features/access, parseDemoSession, mock login/session/logout, protected routing, two visible roles only
- [ ] 1c.3 GREEN: Playwright Login → Dashboard; invalid login stays with accessible error

## Phase 4: MVP chain 1d–3b + PR 4 HTTP — DEFERRED

- [ ] 1d Dashboard/Bodegas deterministic mocks; 2a mock contract + validator; 2b Capture + search/edit; 3a Summary/finalize + receipt; 3b recount loop
- [ ] 4.1 HTTP/query parity only after MVP acceptance
