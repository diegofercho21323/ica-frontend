# Design: Full Real Product — Multi-Company Blind Count

## Technical Approach

F1 reconciles PR2 first: make `saveBatch` attempt-scoped, then bind mock/HTTP behind a config-switched port consumed via `src/app/` providers. Query owns all server state; mock stays as regression harness. F2–F5 ship as target architecture behind backend gates, mock-backed until each gate lands.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| `saveBatch(key, changes)` global vs `saveBatch(attemptId, key, changes)` scoped | Global leaks across attempts, breaks locked-immutability | Scoped signature; per-attempt ledger `${attemptId}:${key}`; delete global overlay |
| Adapter import in features vs `useInventoryApi()` from `app/` | Direct imports block config swap | Factory `resolveInventoryApi()` in `src/app/inventory.ts`; context + hook; features import port type only |
| `VITE_INVENTORY_ADAPTER` default | HTTP-first breaks without backend | `mock` default; `http` opt-in; unknown value falls back to mock + console warn |
| Session owns adapter vs consumes port | `SessionContext` imports mock directly today | `SessionProvider` receives port via props/context; login/logout delegate to port |
| Mock deletion vs harness | Deleting mock loses blind/decimal/409 RED tests | Mock stays permanently as contract reference + regression harness |

## Data Flow

```
Config (VITE_INVENTORY_ADAPTER) ──→ resolveInventoryApi() ──→ InventoryApiContext
                                                                       │
SessionProvider(port) ──→ useSession() ──→ features ──→ useInventoryApi()
                                                                       │
useQuery(['lines', attemptId]) / useMutation(saveBatch) ──→ port ──→ mock | HTTP
                                                                       │
                                                            outbox (F5) / queue UI (F4)
```

Query keys namespaced per attempt (`['capture-lines', attemptId]`, `['attempt-lock', attemptId]`); mutations invalidate on `onSettled`; retry same-payload reuses key, `409` blocks auto-retry.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/shared/api/inventory/port.ts` | Modify | `saveBatch(attemptId, key, changes)`; keep rest |
| `src/shared/api/inventory/mock.ts` | Modify | Per-attempt ledger; remove global overlay; keep locked/409/decimal semantics |
| `src/shared/api/inventory/http.ts` | Modify | Implement App. A DTOs, `Idempotency-Key` header, typed `HttpError` mapping |
| `src/app/inventory.ts` | Create | `resolveInventoryApi()` + `InventoryApiContext` + `useInventoryApi()` |
| `src/app/providers.tsx` | Modify | Compose Query + ConfigProvider + Inventory + Session providers |
| `src/features/access/SessionContext.tsx` | Modify | Consume port from context, drop direct mock import |
| `src/features/capture/useCaptureForm.ts` | Modify | Use `useInventoryApi()`; require `attemptId`; scoped keys |
| `*.test.ts` (saveBatch, capture) | Modify | Attempt-scoped cases: dedupe, conflict, locked-409, decimal-verbatim |

## Interfaces / Contracts

```ts
// port.ts (F1 change)
saveBatch(attemptId: string, idempotencyKey: string, changes: CaptureChange[]): Promise<void>
// app/inventory.ts
declare function resolveInventoryApi(): InventoryApiPort // env VITE_INVENTORY_ADAPTER
declare function useInventoryApi(): InventoryApiPort
```

F2–F5 target (gated, not built in F1): `ChangeInput { quantity: string-exact, unit: exact, capture_method, confirm_unusual_quantity }`; uppercase `GUIDED`/`MANUAL`; `session_id` linking start→history→recount; queue states `synced/pending/conflict`; outbox record `{attempt_id, body, Idempotency-Key}` in versioned `idb-keyval`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Scoped ledger, 409 conflict, locked immutability, decimal-verbatim, no float coercion | `npm run test:run`, STRICT TDD |
| Integration | Config swap needs zero feature edits; session gates; Query invalidation | Provider + Query harness tests |
| E2E | Keyboard-only capture loop; blind-safety forbidden fields | Playwright, existing blind tests extended |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. F1 is internal refactor behind identical mock behavior (2 chained PRs ≤400 lines: port+mock, then providers+features). F2–F5 gates: backend URL/CORS/auth, `session_id` + reads, roles, storage policy. Brand tokens are confirmed (Ducore / Tallycore); token values resolve via `ConfigProvider` and stay swappable at that layer. Each phase flag-offs to mock.

## Open Questions

- [x] Legacy `/capture` without `attemptId`: RESOLVED (F1-PR3) — require attempt, drop legacy path. Bare `/capture` redirects to `/bodegas` (scope selection / attempt start); blind capture only runs inside a started attempt at `/capture/:attemptId`.
- [ ] `payload_hash` display policy (GAP-2) — needed before F4 receipt UI
- [ ] Secure token/offline-data storage + wipe policy (GAP-3) — needed before F2 close
