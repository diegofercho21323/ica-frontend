# Tasks: Mock Access (3 demo roles)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–650 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR on `feat/access-1c-mock` |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|----------------------|-----------------|-------------------|
| 1 | Session domain (parse+persist+context) | Single | `npm run test:run src/features/access` | N/A (unit layer, no runnable UI yet) | `src/features/access/` removable; providers untouched |
| 2 | Guard+form+wiring+i18n+e2e | Single | `npm run test:run` + `npx playwright test e2e/login.spec.ts` | `npm run dev` → manual Login→Dashboard per role | Revert router/screens/es.json wiring; placeholder LoginPage restored |

## Phase 1: Session domain (TDD) — DONE (verify 9/9 green, e2e 2/2, 2026-09-07)

- [x] 1.1 RED: `src/features/access/parseDemoSession.test.ts` — valid roles pass, junk/null/wrong-role return null
- [x] 1.2 GREEN: created `src/features/access/parseDemoSession.ts` per design contract
- [x] 1.3 RED: persistence test — `demo-session` key round-trips `toPersistedSession()`, password never stored
- [x] 1.4 GREEN: wired `demo-session` key in existing `ica-demo` store adapter
- [x] 1.5 RED: `src/features/access/SessionContext.test.tsx` — login sets session, logout clears, reload restores
- [x] 1.6 GREEN: created `src/features/access/SessionContext.tsx` (`useSession`, login/logout vs `loginDemo`)

## Phase 2: Guard + form (TDD) — DONE

- [x] 2.1 RED: `src/features/access/RequireAuth.test.tsx` — anonymous redirects `/login`, session renders outlet
- [x] 2.2 GREEN: created `src/features/access/RequireAuth.tsx` (`<Navigate to="/login" state={{from}}>`)
- [x] 2.3 RED: `src/features/access/LoginForm.test.tsx` — empty→required errors, invalid→stays+`access.invalid`, valid→login call
- [x] 2.4 GREEN: created `src/features/access/LoginForm.tsx` (AntD `onFinish`, `useState` mirror, `role="alert"` errors)

## Phase 3: Wiring + e2e — DONE

- [x] 3.1 Added `access.*` keys to `src/app/i18n/es.json` (title, labels, required, invalid)
- [x] 3.2 Mounted `SessionProvider` in `src/app/providers.tsx`; wrapped dashboard/bodegas/capture in `RequireAuth` in `src/app/router.tsx`; `LoginPage` renders `LoginForm` in `src/pages/screens.tsx`
- [x] 3.3 Created `e2e/login.spec.ts` — happy path Login→Dashboard + invalid stays with accessible error
- [x] 3.4 Verified: `npm run test:run` 62/62 green + `npx playwright test e2e/login.spec.ts` 2/2 green
