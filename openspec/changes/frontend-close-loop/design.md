# Design: frontend-close-loop

## Technical Approach

Close the blind-count loop on the deterministic mock per PRD 12.1–12.5. PR1 builds the additive mock foundation (attempt store, versioning, `HttpError`); PR2–PR4 layer thin FSD slices on top via the existing `InventoryApiPort` + React Query + idb-keyval patterns. No HTTP adapter change; no visual-shell change.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Attempt state in mock module vs React store | Module Map is deterministic, survives no backend, trivial `resetDemo` | `Map<attemptId, AttemptRecord>` in `mock.ts`, deterministic ids (`att-<n>-<scope>`) |
| Error shape: `Error(msg)` vs typed `HttpError` | Typed costs one class, buys 422/409/403 contract tests | New `HttpError {status, code}` in `shared/api/inventory/`, mirrors PRD appendix A |
| New slices vs extend capture/bodegas | Capture stays blind-entry; lifecycle needs own boundary | New `features/attempts` (start/review/finalize/submit/history) + `features/recount` (leader only) |
| Idempotency keys: per-hook memory vs shared registry | Memory loses keys on reload, breaks retry-same-key | Shared registry (`shared/lib/idempotency.ts`) + idb-backed store in new `shared/lib/submission-queue.ts` |
| Offline: React Query cache vs idb-keyval | Query cache is ephemeral; spec demands reload persistence | idb `attempt-bodies` + `submit-queue` + `receipts`; `useSyncQueue` drains on `online`/mount; `UnsyncedBadge` in shell |

## Data Flow

Start→capture→review→finalize→submit→retry→recount→v2:

```
BodegasList ──startAttempt(scope,mode)──→ mock store ──→ /capture/:attemptId
CaptureTable ──saveBatch(key,changes)──→ per-attempt lines ──→ ReviewScreen
ReviewScreen ──finalize{confirm_uncounted}──→ locked v1 ──submit(key)──→ Receipt
FAILED ──retry same key──→ Receipt │ 409 ──authorizeReplacementKey──→ resubmit
HistoryScreen ──versions[]──→ resubmit │ Leader RecountScreen ──subset──→ blind v2
```

Finalize-lock:

```
Review → finalize(id) → 422 PENDING_EXIST? → ConfirmDialog → finalize(id,{confirm:true}) → locked v1 (inputs disabled)
```

Submit-retry:

```
Submit(key) → SUCCEEDED receipt │ FAILED → retry same key → terminal receipt │ 409 distinct → authorizeReplacementKey → new key → resubmit
```

## File Changes

| File | Action | Description |
|---|---|---|
| `shared/api/inventory/errors.ts` | Create | `HttpError {status, code}` + codes 400/403/404/409/422 |
| `shared/api/inventory/models.ts` | Modify | Additive `AttemptRecord`, `AttemptVersion`, `Receipt`, `ReviewView` |
| `shared/api/inventory/port.ts` | Modify | `getReview`, `finalize(id,{confirm_uncounted})→Version`, `submit→Receipt`, `getHistory`, `createRecount` |
| `shared/api/inventory/mock.ts` | Modify | Attempt Map, versioning, 422/409/403 guards, deterministic ids |
| `shared/lib/submission-queue.ts` | Create | idb bodies/queue/receipts + `useSyncQueue` + `UnsyncedBadge` state |
| `shared/lib/persistence.ts` | Modify | Versioned queue keys + `resetDemo` path |
| `features/attempts/*` | Create | `StartAttemptButton`, `ReviewScreen`, `FinalizeDialog`, `HistoryScreen`, `useAttempt/useReview/useFinalize/useSubmit` hooks |
| `features/recount/*` | Create | `RecountScreen`, `useRecountSelection`; sole `leader-models.ts` importer (fix depcruiser path) |
| `features/capture/useCaptureForm.ts` | Modify | `useCaptureForm(attemptId)`, scoped query key, locked read-only |
| `features/bodegas/BodegasList.tsx` | Modify | Scope card → `startAttempt` → `/capture/:attemptId`, `t()` errors |
| `app/router.tsx`, `pages/screens.tsx` | Modify | `/capture/:attemptId`, `/attempts/:id/review|history`, leader-only `/attempts/:id/recount` via `RequireRole` |
| `app/i18n/es.json` | Modify | Namespaces `attempt`, `review`, `submission`, `recount`, `history`, `queue` |

## Interfaces / Contracts

```ts
class HttpError extends Error { status: 400|403|404|409|422; code: string }
type AttemptRecord = { attempt: Attempt; lines: Map<code, OperatorLineView>; versions: AttemptVersion[]; locked: boolean }
type AttemptVersion = { v: number; lockedAt: string; lineCount: number; submission?: Receipt }
type Receipt = { key: string; status: 'SUCCEEDED'|'FAILED'; payload_hash: string; erp_reference: string | null }
// Port additions return Versions/Receipts; submit takes no body (NOT_FOUND excluded from ERP payload server-side).
```

Routes + guards: all under `RequireAuth`; recount additionally under `RequireRole('cost-leader')` → inline 403, never quantities leak. Review completeness exposes identity+unit only. Quantities stay exact-decimal strings; no `<input type=number>`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (contract) | 422 without confirm, lock immutability, idempotent replay, 409 replacement, 403 non-leader, 400 empty recount | Vitest vs mock, strict TDD per PR |
| Integration | Review render counted/pending, finalize dialog, retry-same-key, queue reload restore + badge, blind v2 zero qtys | RTL + user-event, idb-keyval mock |
| E2E | start→lock→submit→receipt happy path | Playwright (deferred, `e2e/` empty) |

Gates per PR: `lint`, `typecheck`, `fsd`, `test:run` green.

## Threat Matrix

N/A — no routing beyond client-side React Router paths, and no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. `references/threat-matrix.md` absent. Expected behavior: unknown `:attemptId` → `t()` 404, no navigation; non-leader recount → 403 inline.

## Migration / Rollout

No backend migration. idb additive keys versioned; `resetDemo()` clears Maps + idb queue. Per-PR rollback (reverse order): PR1 revert mock/models/port + `resetDemo`; PR2 revert attempts/review + `useCaptureForm` signature; PR3 revert queue lib/badge + submit UI (stale queue keys ignored by version); PR4 revert recount/history routes + depcruiser path. Each PR self-contained behind existing routes.

## Open Questions

- [ ] PRD appendix A exact `code` strings for 422/409 — mirror or confirm?
- [ ] Recount assignee source: free input vs session user list?
- [ ] `confirm_uncounted` naming final (`confirmUncounted` vs snake)?
