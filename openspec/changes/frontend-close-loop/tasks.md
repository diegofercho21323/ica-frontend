# Tasks: frontend-close-loop

## Review Workload Forecast

| PR | Lines | Focus |
|----|-------|-------|
| PR1 | ~250 | Mock foundation + contract tests |
| PR2 | ~250 | Review + finalize |
| PR3 | ~250 | Submissions + queue + badge |
| PR4 | ~250 | Recount + history |
| Total | ~1000 | 4 PRs |

Session budget 800: total exceeds, per-PR within. feature-branch-chain + tracker.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units

| Unit | Test command | Harness | Rollback boundary |
|------|--------------|---------|-------------------|
| 1 Mock store + errors | `npm run test:run -- mock` | N/A (mock-only) | `shared/api/inventory/*` + `resetDemo` |
| 2 Review + finalize | `npm run test:run -- review` | `/attempts/:id/review` lock | `features/attempts/*` + `useCaptureForm` sig |
| 3 Submit + queue | `npm run test:run -- submission` | Reload restores queue+badge | `submission-queue.ts` + submit UI |
| 4 Recount + history | `npm run test:run -- recount history` | Leader v2 blind capture | Recount/history routes + depcruiser |

## PR1: Mock foundation

- [x] 1.1 RED: `startAttempt` POST /sessions, 422 w/o confirm, immutability, replay, 409, 403, 400
- [x] 1.2 Create `shared/api/inventory/errors.ts` (`HttpError {status, code}` 400/403/404/409/422)
- [x] 1.3 Modify `shared/api/inventory/models.ts` (add `AttemptRecord`, `AttemptVersion`, `Receipt`, `ReviewView`)
- [x] 1.4 Modify `shared/api/inventory/port.ts`: `startAttempt` POST /sessions, `getReview`, `finalize(id,{confirm_uncounted})`, `submit→Receipt`, `getHistory`, `createRecount`
- [x] 1.5 Modify `shared/api/inventory/mock.ts`: `Map<attemptId, AttemptRecord>`, ids `att-<n>-<scope>`, versioning, guards
- [x] 1.6 GREEN: test/lint/typecheck/fsd

## PR2: Review + finalize

Files: `features/attempts/ReviewScreen.tsx`, `FinalizeDialog.tsx`, `useReview.ts`, `useFinalize.ts`; modify `features/capture/useCaptureForm.ts`, `features/bodegas/BodegasList.tsx`, `app/router.tsx`; i18n `attempt`, `review`.
- [ ] 2.1 RED: counted values / pending identity+unit only, 422 dialog, lock disables inputs
- [ ] 2.2 Create `useReview.ts` + `ReviewScreen.tsx` (completeness identities+units only)
- [ ] 2.3 Create `useFinalize.ts` + `FinalizeDialog.tsx` (422 → confirm → locked v1)
- [ ] 2.4 Modify `useCaptureForm.ts` to `useCaptureForm(attemptId)` scoped key, locked read-only; blind rule: `NOT_COUNTED` rows hide `currentQuantity` until counted
- [ ] 2.5 Modify `BodegasList.tsx` (scope → `startAttempt` → `/capture/:attemptId`, `t()` errors) + routes
- [ ] 2.6 GREEN: test/lint/typecheck/fsd

## PR3: Submissions + queue

Files: modify `shared/lib/idempotency.ts` (reuse registry), create `shared/lib/submission-queue.ts`, modify `shared/lib/persistence.ts`, create `useSubmit.ts`, receipt UI, `UnsyncedBadge`; i18n `submission`, `queue`.
- [ ] 3.1 RED: SUCCEEDED receipt, FAILED retry same key, 409 blocks until `authorizeReplacementKey`, reload restores queue+badge
- [ ] 3.2 Modify `idempotency.ts` (stable keys) + create `submission-queue.ts` (idb bodies/queue/receipts, `useSyncQueue`)
- [ ] 3.3 Modify `persistence.ts` (versioned keys + `resetDemo`) + shell `UnsyncedBadge`
- [ ] 3.4 Create `useSubmit.ts` + receipt UI (no body, `NOT_FOUND` excluded server-side)
- [ ] 3.5 GREEN: test/lint/typecheck/fsd

## PR4: Recount + history

Files: `features/recount/RecountScreen.tsx`, `useRecountSelection.ts` (sole `leader-models.ts` importer), `features/attempts/HistoryScreen.tsx`, `app/router.tsx`; i18n `recount`, `history`.
- [ ] 4.1 RED: leader selection → blind v2, empty 400, non-leader 403, history immutable + resubmit
- [ ] 4.2 Create `RecountScreen.tsx` + `useRecountSelection.ts`; v2 blind rule: `NOT_COUNTED` rows hide `currentQuantity`
- [ ] 4.3 Create `HistoryScreen.tsx` (newest-first, resubmit via idempotent contract, no leak)
- [ ] 4.4 Modify `app/router.tsx` (leader-only `/attempts/:id/recount` via `RequireRole`, `/attempts/:id/history`) + depcruiser fix
- [ ] 4.5 GREEN: test/lint/typecheck/fsd
