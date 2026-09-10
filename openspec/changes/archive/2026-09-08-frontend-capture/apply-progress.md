# Apply Progress: Blind-Count Capture Page (frontend-capture)

Work unit: `capture-impl`. Mode: Strict TDD, runner `npm run test:run`.
Delivery: single PR with `size:exception` (maintainer decision; ~781 changed
lines vs 400 budget, within 800 session budget).

## TDD Cycle Evidence

| Task | RED (failing first) | GREEN (implementation) | REFACTOR |
|------|---------------------|------------------------|----------|
| 1.1 → 2.1 validation | `validation.test.ts` failed on missing `./validation` import (run 20:30) | `validation.ts` (`QTY_RE`, `toPayloadQty`) → 24/24 incl. ban test | Comment reworded to keep ban-clean (ban test flagged `Number()` in prose) |
| 1.2 → 2.2 mock saveBatch | `mock.saveBatch.test.ts` failed on `unsupported('Saving captures')` | `mock.ts` key ledger + applied-state overlay + `resetDemo` clear | Conflict throw on same-key/different-payload kept as idempotency semantic |
| 1.3 → 3.1/3.2 slice | `CaptureTable.test.tsx` failed on missing module | `useCaptureForm.ts` + `CaptureTable.tsx`; 6/6 green after jsdom/AntD interaction fixes (test-only) | `selectState` helper: title-scoped, last-dropdown, mousedown+click |
| 1.4 ban | `no-float-coercion.test.ts` failed (no sources) | Green; production `src/features/capture/` ban-clean | Banned literals concatenated in the test so grep stays empty |
| 4.1–4.3 wiring | Pre-existing `app.smoke` placeholder test failed post-swap (expected) | `CapturePage`, router, `es.json capture.*`; smoke test updated to blind-table assertions | Removed dead `capturePlaceholder` key |
| 5.1 verification | — | `typecheck` clean, `lint` clean, 103/103 tests green (`--maxWorkers=2`), `npm run build` succeeds | — |
| 5.2 smoke | — | Spanish copy + blind render asserted in `app.smoke`; retry same-key+same-payload asserted in slice tests; `<sm` via `scroll={{x:true}}` + `overflow-x-auto` (browser check deferred, e2e/ empty per design) | — |

No task completed without its RED test first. No silent fallback to standard mode.

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command and exact result | `npm run test:run -- capture` → 3 files, 28 tests passed; `npm run test:run -- validation mock.saveBatch no-float-coercion` → 3 files, 24 tests passed |
| Full suite and exact result | `npx vitest run --maxWorkers=2` → 16 files, 103/103 passed; `npm run typecheck` clean; `npm run lint` clean |
| Runtime harness command/scenario and exact result | `npm run build` (vite production build incl. `/capture` route) → `✓ built in 3.04s`. No live browser available headless; `/capture` render path covered by `tests/app.smoke.test.tsx` (10/10) |
| Rollback boundary | Revert `src/features/capture/`, `src/shared/api/inventory/mock.saveBatch.test.ts`, `mock.ts` hunks, `screens.tsx`, `router.tsx`, `es.json capture` block, `tests/app.smoke.test.tsx` capture test → restores placeholder + unsupported `saveBatch`. No migration; mock state in-memory only |

## Notes for Verify

- Default parallel `npm run test:run` trips the 5 s timeout on the
  pre-existing dashboard/bodegas shell test (CPU contention from the added
  AntD-heavy suites; baseline 71 tests passed, suite now 103). All-green
  with `--maxWorkers=2`. Not caused by product logic; consider a follow-up
  infra tweak (worker count or timeout) outside this change.
- `size:exception` applies: ~781 changed lines (691 new + 90 tracked
  add/delete), single PR per maintainer decision.
