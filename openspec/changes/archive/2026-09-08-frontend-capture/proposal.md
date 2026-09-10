# Proposal: Blind-Count Capture Page (frontend-capture)

## Intent

Route `/capture` renders `CapturePlaceholderPage` and `saveBatch` is unsupported. Operators cannot record blind counts. Replace placeholder with a real capture table backed by a `features/capture` slice and mock `saveBatch`.

## Scope

### In Scope
- `CapturePage` on `/capture`: blind table (SKU, description, per-row qty input + state select, batch save button).
- `features/capture` slice: `useState` + AntD Form + `useMutation(saveBatch)`, dirty-row batching, idempotency key per batch from `shared/lib/idempotency`.
- Mock `saveBatch` support in `shared/api/inventory/mock.ts` (in-memory apply, retry reuses key).
- `openspec/specs/capture` spec + `es.json` keys (all strings via `t()`, labels, a11y).
- Regex decimal-string validation; `inputMode="decimal"`, never `type=number`.

### Out of Scope
- Optimistic per-row autosave; search/filter/pagination.
- Real HTTP adapter (`http.ts` stays disabled).
- Table primitive creation (AntD primitives directly).

## Capabilities

### New Capabilities
- `capture`: blind-count recording, qty/state contracts, batch save with idempotency.

### Modified Capabilities
- None.

## Approach

Per-row text Input + state Select (`COUNTED` / `COUNTED_ZERO` / `NOT_FOUND` / `NOT_COUNTED`), dirty rows batched on explicit save with one registry key per batch. Contracts: quantities stay exact decimal strings (SKU-002 `10.10`, SKU-005 `9007199254740993.000001` — no `Number`/`parseFloat`); hide `currentQuantity` for `NOT_COUNTED` rows; `COUNTED_ZERO` sends `'0'`, `NOT_FOUND` sends `null`. FSD: page thin (`pages/screens.tsx` + `router.tsx`), logic in `features/capture/`, key from `shared/lib/`. Precedent: `LoginForm` (`features/access/LoginForm.tsx`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/screens.tsx`, `src/app/router.tsx` | Modified | Swap placeholder for `CapturePage` |
| `src/features/capture/` | New | Slice: table, form state, `useMutation` |
| `src/shared/api/inventory/mock.ts` | Modified | Implement `saveBatch` |
| `src/app/i18n/es.json` | Modified | Capture keys |
| `openspec/specs/capture/` | New | Spec at archive |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Float coercion breaks exact decimals | Med | String-only path; selector/test ban on `Number()` |
| Key-per-row instead of per-batch | Low | Single key minted at save; retry reuses it |

## Rollback Plan

Single PR revert restores `CapturePlaceholderPage` + unsupported `saveBatch`. No migration; mock state in-memory only.

## Dependencies

- None (independent of bodegas PR #13; branch is from `main`).

## Success Criteria

- [ ] `/capture` records blind counts and batch-saves via mock with idempotency key per batch
- [ ] SKU-002 keeps `10.10`; SKU-005 survives without float coercion
- [ ] `NOT_COUNTED` rows never display `currentQuantity`
- [ ] Strict TDD: failing tests first, `typecheck + tests + lint` green

## Work Unit

Single PR, est. ≤800 lines. Slices: (1) mock `saveBatch` + tests, (2) `features/capture` slice + tests, (3) page wiring + i18n + spec.
