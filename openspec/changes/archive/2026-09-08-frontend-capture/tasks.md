# Tasks: Blind-Count Capture Page

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–750 |
| 400-line budget risk | High |
| 800-line session risk | Low |
| Chained PRs recommended | No (single PR; work-unit commits preserve slices) |
| Suggested split | Single PR: mock → slice → wiring (commits separable if reviewer asks) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (single-PR) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

Single-PR justified: preflight session budget is 800 lines; 400-line overrun covered by work-unit commits (mock / slice / wiring), each independently revertible.

## Phase 1: RED tests (TDD, failing first)

- [x] 1.1 RED `src/features/capture/validation.test.ts`: `QTY_RE` accepts `10.10`, `9007199254740993.000001`; rejects `12.3456789`, `abc`; `toPayloadQty` maps `COUNTED_ZERO`→`'0'`, `NOT_FOUND`→`null`
- [x] 1.2 RED `src/shared/api/inventory/mock.saveBatch.test.ts`: same-key same-payload dedupes; `resetDemo` clears keys
- [x] 1.3 RED `src/features/capture/CaptureTable.test.tsx`: blind render, hidden `currentQuantity` for `NOT_COUNTED`, inline error, one-key batch, retry reuses key, success clears dirty
- [x] 1.4 RED ban assertion: grep `Number\(|parseFloat|type="number"|type='number'` in `src/features/capture/` must be empty

## Phase 2: Foundation (GREEN)

- [x] 2.1 Create `src/features/capture/validation.ts` with `QTY_RE`, `toPayloadQty`; make 1.1, 1.4 green
- [x] 2.2 Implement `saveBatch` in `src/shared/api/inventory/mock.ts` via module `Map<key, CaptureChange[]>` + applied-state map; `resetDemo` clears; make 1.2 green
- [x] 2.3 Verify: `npm run test:run -- validation mock.saveBatch`

## Phase 3: Core slice (GREEN)

- [x] 3.1 Create `src/features/capture/useCaptureForm.ts`: row state (`qty`, `rowState`, `dirty`, `error`), regex validate, dirty+valid filter, key `useRef` via `shared/lib/idempotency`, `useMutation(saveBatch)`
- [x] 3.2 Create `src/features/capture/CaptureTable.tsx`: AntD `Table` + per-row `Input inputMode="decimal"` + `Select`, `scroll={{x:true}}`, `aria-busy`, labels via `t()`; make 1.3 green
- [x] 3.3 Verify: `npm run test:run -- capture`

## Phase 4: Wiring

- [x] 4.1 Modify `src/pages/screens.tsx`: `CapturePage` composes slice, replaces `CapturePlaceholderPage`
- [x] 4.2 Modify `src/app/router.tsx`: `/capture` points to `CapturePage`
- [x] 4.3 Modify `src/app/i18n/es.json`: `capture.*` keys (labels, errors, save states); no hardcoded English in JSX
- [x] 4.4 Verify: `npm run test:run`

## Phase 5: Verification

- [x] 5.1 Run `typecheck + npm run test:run + lint` fully green; record results
- [x] 5.2 Manual smoke: `/capture` Spanish copy, `<sm` scroll without overlap, retry preserves payload
