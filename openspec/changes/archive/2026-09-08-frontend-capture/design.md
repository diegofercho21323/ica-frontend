# Design: Blind-Count Capture Page

## Technical Approach

Replace `CapturePlaceholderPage` with thin `CapturePage` composing a new `features/capture` slice. Slice owns `useState` + AntD `Form` row state, regex validation, dirty tracking, and `useMutation(saveBatch)` with one idempotency key per batch from `shared/lib/idempotency`. Mock implements in-memory `saveBatch` with key dedupe. Maps to proposal approach and spec reqs 1–7.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| `useState` + AntD Form vs RHF | RHF heavier; LoginForm precedent is `useState` + AntD Form | Use `useState` + AntD Form, per skill form pattern |
| Key per batch (`useRef`) vs per row | Per-row breaks spec idempotency contract | Mint one key at save via `createIdempotencyRegistry`; retain in ref for retry |
| String-only qty vs numeric coercion | Any `Number()` rewrites `10.10` / `9007199254740993.000001` | Regex `^[0-9]+(\.[0-9]{1,6})?$`, `inputMode="decimal"`, never `type=number` |
| AntD `Table` direct vs custom primitive | Proposal forbids new primitive | AntD `Table` + `Input`/`Select` directly, `scroll={{x:true}}` for mobile |
| Mock in-module `Map` vs fixture mutation | Mutating fixture leaks across tests | Module `Map<key, CaptureChange[]>` + applied-state map; `resetDemo` clears |

## Data Flow

`getOperatorLines` → row state (`qty string`, `rowState`, `dirty`, `error`) → edit/validate inline → save filters dirty+valid → key → `saveBatch(key, changes)` → success clears dirty / failure preserves payload for retry.

```
CapturePage ──→ useCaptureForm ──→ AntD Table (Input+Select per row)
     │                │──→ useMutation(saveBatch) ──→ mockInventoryApi
     │                └──→ idempotency registry (shared/lib)
     └──→ t() ← es.json capture.* 
```

Sequence (load/edit/validate/save/retry):

```
Operator  CaptureTable  useCaptureForm  Query(mock)  Idempotency  mock.saveBatch
   │──open──→│──mount──→│──useQuery getOperatorLines──→│             │
   │         │          │←──lines (blind, NOT_COUNTED)─│             │
   │──type──→│──onChange(qty string)──→│validate regex│             │
   │         │←──inline error | dirty flag────────────│             │
   │──save──→│──submit──→│filter dirty+valid│──getKey──→│──key k──→│ │
   │         │          │──mutate(k,changes)──────────→│──apply──→│ │
   │         │          │←──ok: clear dirty + success t()──────────│ │
   │         │          │←──fail: error Alert + keep k─────────────│ │
   │─retry──→│          │──mutate(same k, same changes)───────────→│ │(dedupe hit → ok)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/capture/CaptureTable.tsx` | Create | Blind AntD Table; per-row `Input inputMode=decimal` + `Select`; `aria-busy`, labels via `t()` |
| `src/features/capture/useCaptureForm.ts` | Create | Row state, regex validate, dirty set, key ref, `useMutation` wiring |
| `src/features/capture/validation.ts` | Create | `QTY_RE`, `toPayloadQty(state, qty)` (`COUNTED_ZERO`→`'0'`, `NOT_FOUND`→`null`) |
| `src/features/capture/*.test.tsx` | Create | Slice + validation + lifecycle tests (TDD first) |
| `src/shared/api/inventory/mock.ts` | Modify | In-memory `saveBatch` + key dedupe; `resetDemo` clears maps |
| `src/pages/screens.tsx` | Modify | `CapturePage` replaces `CapturePlaceholderPage` |
| `src/app/router.tsx` | Modify | `/capture` points to `CapturePage` |
| `src/app/i18n/es.json` | Modify | `capture.*` keys (labels, errors, save states) |

## Interfaces / Contracts

```ts
type RowState = 'COUNTED' | 'COUNTED_ZERO' | 'NOT_FOUND' | 'NOT_COUNTED';
type CaptureRow = { code: string; qty: string; state: RowState; dirty: boolean; error?: string };
// port (existing): saveBatch(idempotencyKey: string, changes: CaptureChange[]): Promise<void>
// mock: seenKeys: Map<string, CaptureChange[]> — same key + same payload → no-op success.
```

`NOT_COUNTED` rows hide `currentQuantity`; excluded from payload until state leaves it.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `QTY_RE` verbatim (`10.10`, big-decimal), `toPayloadQty` mapping | Vitest, incl. `Number(`/`parseFloat` absence assertion |
| Integration | Blind render, hidden qty, inline errors, one-key batch, retry reuse, reset dirty | RTL + user-event, mocked `saveBatch` spy |
| E2E | Mobile scroll, Spanish copy | Manual/Playwright smoke only (e2e/ empty) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Single-PR revert restores placeholder + unsupported `saveBatch`; mock state in-memory only.

## Open Questions

None.
