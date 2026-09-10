# Proposal: frontend-close-loop

## Intent

Close the blind-count loop end-to-end against the deterministic mock per PRD flows 12.1–12.5: attempt → review → finalize/lock → submit → recount → history, with offline persistence. Today only scope list and hardcoded-`capture` entry exist; no lifecycle, lock, receipts, recount, or history.

## Scope

### In Scope
- Attempt lifecycle: `startAttempt` GUIDED/MANUAL from scope selection; attempt-scoped capture (`/capture/:attemptId`)
- Review: counted/pending + completeness; finalize/lock with 422 confirm dialog, immutable locked
- Submissions: idempotent submit, SUCCEEDED/FAILED receipts, retry same key, 409 + `authorizeReplacementKey`
- Recount: leader selects lines + assignee → blind v2+ subset (`features/recount` only)
- History: immutable versions + resubmit; idb persistence (attempt bodies + queue + receipts, unsynced badge)

### Out of Scope
- Design polish / visual-shell changes
- HTTP adapter enablement (stays disabled); real backend wiring
- Server-side conflict resolution beyond mock 409 flow

## Capabilities

### New Capabilities
- `attempt-review`: counted/pending review + completeness gate
- `attempt-submission`: idempotent submit, receipts, retry/replacement-key
- `attempt-recount`: leader line selection + blind v2+ subset
- `attempt-history`: immutable versions + resubmit

### Modified Capabilities
- `capture`: bind capture to `attemptId` (remove hardcoded `capture` id)
- `bodegas-list`: scope selection starts attempt, routes to `/capture/:attemptId`

## Approach

Coherent mock attempt store + versioning: `Map<attemptId, AttemptRecord>`, deterministic ids, shared `HttpError {status, code}` mirroring PRD appendix A. New slices `features/attempts` + `features/recount` (sole importer of `leader-models.ts`); idb queue shape extension; routes `/bodegas` → `/capture/:attemptId` → `/attempts/:id/review` → `/attempts/:id/history`, leader-only `/attempts/:id/recount`. Strict TDD per PR.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/api/inventory/mock.ts` | Modified | Attempt store, versioning, 422/409 errors |
| `src/shared/api/inventory/port.ts` | Modified | Review/recount/history ops |
| `src/features/attempts/` | New | Attempt, review, finalize, submit, history UI |
| `src/features/recount/` | New | Leader recount slice (sole `leader-models.ts` importer) |
| `src/features/capture/` | Modified | Attempt-scoped capture hook/table |
| `src/features/bodegas/` | Modified | Scope → `startAttempt` entry |
| `src/shared/lib/persistence.ts` | Modified | Attempt bodies, queue, receipts, badge |
| `src/app/router.tsx` | Modified | Attempt routes + leader guard |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep into polish | Med | Reject non-flow UI diffs in review |
| Mock/HTTP contract drift | Low | Shared `HttpError`; contract tests per op |
| idb schema migration breaks demo | Low | Versioned store + `resetDemo` path tested |

## Rollback Plan

Revert PRs in reverse order (PR4→PR1); each PR is self-contained behind existing routes. `resetDemo()` + idb version bump restores deterministic fixture state. No backend state exists.

## Dependencies

- `feat/cierre-mock` branch (bodegas + capture merged); chain strategy confirmed at tasks-gate

## Success Criteria

- [ ] Blind count completes start→review→lock→submit→receipt per PRD 12.1–12.5 on mock
- [ ] Locked attempts immutable; 422/409 flows behave per spec
- [ ] Offline queue + receipts persist across reload with unsynced badge
- [ ] `lint`, `typecheck`, `fsd`, `test:run` green per PR

## Work-Unit Boundaries

- PR1 mock foundation (~250 lines): attempt store + versioning + `HttpError` + contract tests
- PR2 review+finalize: review UI, completeness gate, lock + 422 dialog
- PR3 submissions+queue: submit, receipts, retry/replacement-key, idb queue + badge
- PR4 recount+history: leader recount slice + history versions + resubmit
