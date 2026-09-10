# Tasks: Full Real Product — Multi-Company Blind Count

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1800–2400 total; ~200–350 per PR |
| 400-line budget risk | High (total) / Low (per slice) |
| Chained PRs recommended | Yes |
| Suggested split | F1-PR1 → F1-PR2 → F2 → F3 → F4 → F5 |
| Delivery strategy | chained-prs |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| F1-PR1 | Attempt-scoped port+mock | PR 1 | `npm run test:run mock.saveBatch` | Mock harness, no network (N/A backend — mock-only) | `port.ts`+`mock.ts` revert, behavior identical |
| F1-PR2 | Switchable adapter providers | PR 2 | `npm run test:run` full suite | Boot with `VITE_INVENTORY_ADAPTER=mock\|http` | `src/app/inventory.ts`+providers revert to direct mock |
| F2 | HTTP contract+auth+tenancy | PR 3–4 | `npm run test:run http` | Staging backend URL/CORS/auth | `http.ts`+`SessionContext.tsx` revert to mock |
| F3 | Capture primitives+guided | PR 5–6 | `npm run test:run capture` | Keyboard-only capture loop | `features/capture/`+`guided-capture/` revert |
| F4 | Submit/recount/history queue | PR 7 | `npm run test:run queue` | Submit→receipt→recount vs staging | `features/submission/` revert, queue hidden |
| F5 | PWA outbox+telemetry | PR 8 | `npm run test:run outbox` | Offline→reconnect replay | Outbox/telemetry modules revert, online-only |

## Phase F1-PR1: Attempt-Scoped Port + Mock (RED-first)

- [x] 1.1 RED: extend `src/shared/api/inventory/mock.saveBatch.test.ts` — cross-attempt leak, locked-409, decimal-verbatim (`9007199254740993.000001`), same-`idempotencyKey`-different-body 409
- [x] 1.2 GREEN: change `src/shared/api/inventory/port.ts` to `saveBatch(attemptId, idempotencyKey, changes)`; per-attempt ledger in `src/shared/api/inventory/mock.ts`; delete global overlay
- [ ] 1.3 REFACTOR: update `src/shared/api/inventory/mock.closeLoop.test.ts`; verify `npm run test:run`; commits: `test(inventory): red attempt-scoped cases`, `feat(inventory): scope saveBatch per attempt` ← file update + commits done (2a9cafc, 8353925); repo-wide verify RED on downstream callers (see apply-progress), owned by F1-PR2+ migration

## Phase F1-PR2: Providers + Features Adapter Swap (RED-first)

- [x] 2.1 RED: add `src/app/inventory.test.ts` — mock default, unknown→mock+warn, zero `features/` imports of `mock`/`http`/`axios`
- [x] 2.2 GREEN: create `src/app/inventory.ts` (`resolveInventoryApi`, context, `useInventoryApi`); modify `src/app/providers.tsx`; drop mock import in `src/features/access/SessionContext.tsx`
- [x] 2.3 GREEN: migrate `src/features/capture/useCaptureForm.ts` to `useInventoryApi()` with scoped keys `['capture-lines', attemptId]`; commits: `test(app): red adapter resolution`, `feat(app): wire switchable inventory port` ← done (0ca8dea, 9d7f4b0); repo-wide 123/134 green, 11 residual owned-by-later (see apply-progress)

## Phase F2 Epic (skeleton, gate: backend URL/CORS/auth/`session_id`/reads)

- [x] 3.1 Implement `src/shared/api/inventory/http.ts` App. A DTOs, `Idempotency-Key` header, typed `HttpError` 400/401/403/404/409/422; token flow in `SessionContext.tsx`; tenant catalog in `src/features/`; budget ≤400 lines/PR ← PR3 foundation slice (http gating+batch+auth+tenant) + PR4 remainder (submit wiring + queue linkage, queue UI stays in F4 5.1)

## Phase F3 Epic (skeleton, gate: brand token values)

- [ ] 4.1 Guided/manual capture, 12 primitives via `shared/ui/primitives/`, `ChangeInput` exact-string quantity, advisory 422 confirm resend, AA + `t()` `es` complete; budget ≤400 lines/PR

## Phase F4 Epic (skeleton, gates: roles + reads)

- [ ] 5.1 Submission queue (`synced/pending/conflict`), 409 never auto-retries, retry reuses `idempotencyKey`, recount/history by `session_id`; budget ≤400 lines/PR

## Phase F5 Epic (skeleton, gate: storage policy)

- [ ] 6.1 PWA shell (`vite-plugin-pwa`), versioned `idb-keyval` outbox `{attempt_id, body, Idempotency-Key}`, ordered replay, telemetry (timing/unit-errors/retries, blind-safe); budget ≤400 lines/PR
