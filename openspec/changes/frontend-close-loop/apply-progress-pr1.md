# Apply progress: frontend-close-loop — PR1 (closeloop-pr1-foundation)

Work unit: mock store + errors. Scope: PR1 tasks 1.1–1.6 only. PR2–PR4 untouched.

## Status

- [x] 1.1 RED contract tests (`mock.closeLoop.test.ts`, 8 tests)
- [x] 1.2 `errors.ts` — `HttpError {status, code}`
- [x] 1.3 `models.ts` — additive `Receipt`, `AttemptVersion`, `ReviewView`, `AttemptRecord`, `FinalizeOptions`, `RecountInput`
- [x] 1.4 `port.ts` — `getReview`, `finalize(id, options?) → AttemptVersion`, `submit → Receipt`, `getHistory`, `createRecount`
- [x] 1.5 `mock.ts` — attempt Map, `att-<n>-<scope>` ids, versioning, guards, `loadPreset` seeds
- [x] 1.6 GREEN — full `test:run` green; `fsd` green; `typecheck`/`lint` green except pre-existing `screens.tsx` unused-var (untouched, out of scope)

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|------|-----|-------|----------|
| 1.1 contract tests | Import of missing `./errors` failed suite; 8 tests written before impl | 8/8 pass after mock/port/models/errors | 409-test reworked: identical seeds replay, so divergence via `saveBatch` overlay; `saveBatch` routes into unlocked attempts |
| 1.2–1.5 impl | n/a (production code under test) | Focused `test:run -- mock`: 12/12; full `test:run`: 115/115 | `loadPreset` reuses `requireAttempt`/`lockRecord`/`createRecount` instead of duplicating |

## Work Unit Evidence

| Evidence | Value |
|----------|-------|
| Focused test command | `npm run test:run -- mock` → 2 files, 12/12 passed |
| Full suite | `npm run test:run` → 18 files, 115/115 passed |
| Runtime harness | N/A (mock-only, no runtime boundary) |
| `fsd` | depcruise: no violations (64 modules) |
| `typecheck`/`lint` | Only pre-existing `src/pages/screens.tsx(10,10)` unused-var; file untouched, out of PR1 additive scope |
| Rollback boundary | `src/shared/api/inventory/{errors.ts, mock.closeLoop.test.ts}` (delete) + revert `{mock,models,port,http}.ts`; `resetDemo` clears new stores |

## Deviations from design

- `saveBatch` conflict now throws `HttpError` 409 (was plain `Error`); existing tests still pass (`rejects.toThrow`).
- `saveBatch` overlays unlocked attempt records; all-locked → 409 `ATTEMPT_LOCKED`. Per-attempt routing still lands in PR2.
- `getOperatorLines` keeps legacy global overlay for unknown ids (existing `capture` view + old tests); attempt ids read from the store.
- `createRecount` role source: mock tracks `loginDemo` role (default `operator`); leader-only, `demo-admin` denied — matches PR4 `RequireRole('cost-leader')`.
- `authorizeReplacementKey` mints `${key}-replacement-<n>`; 404 `SUBMISSION_NOT_FOUND` for unknown keys.
- `finalize` on a locked attempt replays the latest version (idempotent) instead of erroring.
- Error `code` strings are mock-contract names; PRD appendix A exact strings still open per design.

## Issues found

- Pre-existing `typecheck`/`lint` failure in `src/pages/screens.tsx` (unused `PlaceholderPage`) on branch `feat/cierre-mock`; not introduced here, left for its owning work unit.
