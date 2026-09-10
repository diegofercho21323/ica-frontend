# Tasks: Full Real Product — Multi-Company Blind Count

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2600 total; ~150–350 per PR |
| 400-line budget risk | High (total) / Low (per slice) |
| Chained PRs recommended | Yes |
| Suggested split | F1-PR3 → F3-PR1..4 → F4-PR1..2 → F5-PR1..3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| F1-PR3 (1.3–1.4) | Repo-wide green after attempt-scoped `saveBatch` | PR 1 | `npm run test:run` + `npm run typecheck` | Full suite green (N/A — mock-only) | test + caller edits revert; `mock.ts`/`port.ts` unchanged |
| F3-PR1 (4.1–4.2) | Tallycore AntD tokens + `ConfigProvider` + AA table | PR 2 | `npm run test:run -- src/app/theme/tokens.test.ts` | Boot shell, inspect resolved tokens | `src/app/theme/` + one `providers.tsx` line revert |
| F3-PR2 (4.3–4.4) | Modal/Drawer/Table/Progress primitives | PR 3 | `npm run test:run -- src/shared/ui/primitives` | RTL render + keyboard nav | new primitive files revert |
| F3-PR3 (4.5–4.6) | UnitBadge/ScannerTrigger + token retheme of 6 primitives | PR 4 | `npm run test:run -- src/shared/ui/primitives` | keyboard focus-ring check | primitive files revert to prior styles |
| F3-PR4 (4.7–4.8) | Guided + manual capture screens, 422 confirm-resend | PR 5 | `npm run test:run -- src/features/capture` | keyboard-only capture loop | `features/capture/guided`,`/manual` + `change-input.ts` revert |
| F4-PR1 (5.1–5.2) | Visible queue states + deliberate 409 recovery | PR 6 | `npm run test:run -- src/features/submission` | submit→409→replacement-key vs mock | `features/submission/` revert |
| F4-PR2 (5.3–5.4) | Session-scoped recount + history | PR 7 | `npm run test:run -- src/features/recount` | start→history→recount by `session_id` | `features/recount/` + `session_id` thread revert |
| F5-PR1 (6.1–6.2) | Installable offline PWA shell | PR 8 | `npm run test:run -- src/app/pwa` | offline reload of cached route | `vite-plugin-pwa` config + `src/app/pwa/` revert |
| F5-PR2 (6.3–6.4) | Versioned `idb-keyval` outbox + ordered replay | PR 9 | `npm run test:run -- src/shared/lib/outbox` | offline→reconnect replay, 409 holds line | `src/shared/lib/outbox/` revert |
| F5-PR3 (6.5–6.6) | Blind-safe telemetry aggregates | PR 10 | `npm run test:run -- src/shared/lib/telemetry` | run guided save, inspect payload | `src/shared/lib/telemetry/` revert |

## Phase F1-PR1: Attempt-Scoped Port + Mock (RED-first)

- [x] 1.1 RED: extend `src/shared/api/inventory/mock.saveBatch.test.ts` — cross-attempt leak, locked-409, decimal-verbatim (`9007199254740993.000001`), same-`idempotencyKey`-different-body 409
- [x] 1.2 GREEN: change `src/shared/api/inventory/port.ts` to `saveBatch(attemptId, idempotencyKey, changes)`; per-attempt ledger in `src/shared/api/inventory/mock.ts`; delete global overlay
- [x] 1.3 REFACTOR: migrate remaining 2-arg `mockInventoryApi.saveBatch` callers to `saveBatch(attemptId, key, changes)` — fixed `src/features/attempts/ReviewScreen.test.tsx` TS2554 at lines 77 & 110 (only remaining 2-arg callers; `mock.closeLoop.test.ts` already 3-arg, `ReviewScreen.tsx`/`useReview.ts` never call `saveBatch`); `npm run typecheck` clean; commit `refactor(inventory): attempt-scoped saveBatch callers`
- [ ] 1.4 Restore the ~12 red tests documented in `verify-report-f2.md` (read-only): fake-id in `tests/blind-safety.contract.test.ts` + `tests/inventory.contract.test.ts`, `src/features/dashboard/DashboardKpis.test.tsx` fixture, legacy `/capture` in `tests/app.smoke.test.tsx`; `npm run test:run` fully green; commit `test: repo-wide green after attempt-scoped saveBatch`

## Phase F1-PR2: Providers + Features Adapter Swap (RED-first)

- [x] 2.1 RED: add `src/app/inventory.test.ts` — mock default, unknown→mock+warn, zero `features/` imports of `mock`/`http`/`axios`
- [x] 2.2 GREEN: create `src/app/inventory.ts` (`resolveInventoryApi`, context, `useInventoryApi`); modify `src/app/providers.tsx`; drop mock import in `src/features/access/SessionContext.tsx`
- [x] 2.3 GREEN: migrate `src/features/capture/useCaptureForm.ts` to `useInventoryApi()` with scoped keys `['capture-lines', attemptId]`; commits: `test(app): red adapter resolution`, `feat(app): wire switchable inventory port` ← done (0ca8dea, 9d7f4b0); repo-wide 123/134 green, 11 residual owned-by-later (see apply-progress)

## Phase F2 Epic (skeleton, gate: backend URL/CORS/auth/`session_id`/reads)

- [x] 3.1 Implement `src/shared/api/inventory/http.ts` App. A DTOs, `Idempotency-Key` header, typed `HttpError` 400/401/403/404/409/422; token flow in `SessionContext.tsx`; tenant catalog in `src/features/`; budget ≤400 lines/PR ← PR3 foundation slice (http gating+batch+auth+tenant) + PR4 remainder (submit wiring + queue linkage, queue UI stays in F4 5.1)

## Phase F3-PR1: Tallycore Theme Tokens (GAP-1 resolved) — spec: visual-shell "Light Tallycore theme tokens"

- [ ] 4.1 RED `src/app/theme/tokens.test.ts`: assert every value from `visual-shell/spec.md` (read-only) token table (`colorPrimary` `#0B5CD6`, `colorBgLayout` `#F4F6F9`, `colorText` `#1A2332`, `borderRadius` `6`, font scale…), AA contrast ≥4.5:1 per text/bg pair, zero hardcoded hex/font/radius under `src/app` + `src/features`
- [ ] 4.2 GREEN create `src/app/theme/tokens.ts` (`theme.token` + `theme.components`) and `src/app/theme/contrast-table.md`; wrap `src/app/providers.tsx` in AntD `ConfigProvider`; rename "Datup theme tokens" → "Tallycore" in tests/comments; commit `feat(theme): Tallycore AntD tokens`

## Phase F3-PR2: Layout Primitives — spec: visual-shell (token-only styling, focus/target a11y)

- [ ] 4.3 RED `src/shared/ui/primitives/{Modal,Drawer,Table,Progress}.test.tsx`: token-only styling, keyboard nav + focus trap, associated label/`aria-label`, no business logic
- [ ] 4.4 GREEN implement `Modal.tsx`, `Drawer.tsx`, `Table.tsx`, `Progress.tsx` as thin AntD wrappers; commit `feat(ui): layout primitives`

## Phase F3-PR3: Status Primitives + Token Retheme — spec: visual-shell "Status not color-only", "Focus visible and targets sized"

- [ ] 4.5 RED `src/shared/ui/primitives/{UnitBadge,ScannerTrigger}.test.tsx` + retheme assertions on `Button`, `NumericInput`, `SearchInput`, `Status`, `ItemCard`, `LiveRegion`: status = text+icon never color-only, pointer targets ≥24×24 px, `2px #0B5CD6` focus ring offset `2px`
- [ ] 4.6 GREEN add `UnitBadge.tsx` + `ScannerTrigger.tsx`, replace hardcoded styles in the 6 existing primitives with token references; commit `feat(ui): status primitives + token retheme`

## Phase F3-PR4: Guided + Manual Capture Screens — spec: guided-capture (both requirements), capture "Contract-exact ChangeInput"

- [ ] 4.7 RED extend `src/features/capture/guided/GuidedCapture.test.tsx` + new `src/features/capture/manual/ManualCapture.test.tsx`: one `ItemCard` at a time, save auto-advances + saved line stays editable, keyboard loop (`Enter`/arrows/`Ctrl+K`/`Esc`), no theoretical stock/prior counts/variance, blind pending lookup (identity + unit only), `ChangeInput` exact-string `quantity` + exact `unit` + `capture_method`, advisory `422 UNUSUAL_QUANTITY` confirm resends identical string with `confirm_unusual_quantity: true`
- [ ] 4.8 GREEN compose both screens from primitives, add `src/features/capture/change-input.ts` builder, wire 422 confirm-resend, complete `es` capture keys under `src/app/i18n/`; commit `feat(capture): guided + manual blind capture`

## Phase F4-PR1: Submission Queue States — spec: submission-queue "Explicit queue states"

- [ ] 5.1 RED extend `src/features/submission/SubmissionQueue.test.tsx`: `synced`/`pending`/`conflict` shown as text + icon (never color-only), retry of same payload reuses its `Idempotency-Key`, `409` never auto-retries, locked attempt rejects any edit
- [ ] 5.2 GREEN wire `src/features/submission/SubmissionQueue.tsx` to `src/features/submission/submission-queue.ts` helpers + `useInventoryApi()` submit + deliberate replacement-key recovery; commit `feat(submission): visible queue states`

## Phase F4-PR2: Session-Scoped Recount + History — spec: tenant-context "session_id links the loop", access "RequireRole mirrors server"

- [ ] 5.3 RED extend `src/features/recount/useSubmissionHistory.test.tsx` + `src/features/recount/RecountScreen.test.tsx`: history/recount query by `session_id` (never bare `attempt_id` inference), `RequireRole` leader gate on recount, non-leader `403` fires no mutation
- [ ] 5.4 GREEN thread `session_id` from start-attempt through `src/features/recount/useSubmissionHistory.ts` + `useRecount.ts`; apply leader gating; commit `feat(recount): session-scoped history + recount`

## Phase F5-PR1: Installable PWA Shell — spec: offline-outbox "Installable PWA shell"

- [ ] 6.1 RED `src/app/pwa/registerSW.test.ts`: `vite-plugin-pwa` `generateSW` precache manifest built, `registerSW` update prompt exposed, cached-route shell renders offline with queued state instead of network error
- [ ] 6.2 GREEN add `vite-plugin-pwa` dependency, configure `vite.config.ts`, add `src/app/pwa/` register + update-prompt module; commit `feat(pwa): installable offline shell`

## Phase F5-PR2: Versioned Outbox + Ordered Replay — spec: offline-outbox "Versioned durable outbox"

- [ ] 6.3 RED `src/shared/lib/outbox/outbox.test.ts`: persist `{attempt_id, body, Idempotency-Key}` under versioned `idb-keyval` keys, reload restores records as `pending`, replay in original order, `409` on batch 2 holds batch 3 pending deliberate recovery
- [ ] 6.4 GREEN add `src/shared/lib/outbox/outbox.ts` versioned store + ordered replay via TanStack Query `retry`; wire into the submit mutation; commit `feat(outbox): durable versioned offline outbox`

## Phase F5-PR3: Blind-Safe Telemetry — spec: product-telemetry "Capture and submission metrics"

- [ ] 6.5 RED `src/shared/lib/telemetry/telemetry.test.ts`: focus-to-save median/p90 per attempt, unit-error counts, retry/replay counts; payload carries zero quantities, no theoretical stock / prior counts / variance fields
- [ ] 6.6 GREEN add `src/shared/lib/telemetry/telemetry.ts` non-blocking aggregate hooked into guided save + queue retry; commit `feat(telemetry): blind-safe metrics`
