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
- [x] 1.4 Restored the 12 red tests: fake-id contract reads (`tests/blind-safety.contract.test.ts` + `tests/inventory.contract.test.ts`) now start a real attempt; `DashboardKpis` derives demo KPIs from `operatorV2Fixture` (attempt-less mock read dropped) and leaves the migrated-import allowlist; `CaptureTable.attempt.test.tsx` stale reveal-on-counted assertion replaced with F6-P1 blindness assertion; legacy attempt-less `/capture` route redirects to `/bodegas` (design open question resolved: require attempt, drop legacy path), `app.smoke.test.tsx` reworked accordingly. `npm run test:run` 246/246 green; lint + typecheck + fsd clean; commit `test: repo-wide green after attempt-scoped saveBatch`

## Phase F1-PR2: Providers + Features Adapter Swap (RED-first)

- [x] 2.1 RED: add `src/app/inventory.test.ts` — mock default, unknown→mock+warn, zero `features/` imports of `mock`/`http`/`axios`
- [x] 2.2 GREEN: create `src/app/inventory.ts` (`resolveInventoryApi`, context, `useInventoryApi`); modify `src/app/providers.tsx`; drop mock import in `src/features/access/SessionContext.tsx`
- [x] 2.3 GREEN: migrate `src/features/capture/useCaptureForm.ts` to `useInventoryApi()` with scoped keys `['capture-lines', attemptId]`; commits: `test(app): red adapter resolution`, `feat(app): wire switchable inventory port` ← done (0ca8dea, 9d7f4b0); repo-wide 123/134 green, 11 residual owned-by-later (see apply-progress)

## Phase F2 Epic (skeleton, gate: backend URL/CORS/auth/`session_id`/reads)

- [x] 3.1 Implement `src/shared/api/inventory/http.ts` App. A DTOs, `Idempotency-Key` header, typed `HttpError` 400/401/403/404/409/422; token flow in `SessionContext.tsx`; tenant catalog in `src/features/`; budget ≤400 lines/PR ← PR3 foundation slice (http gating+batch+auth+tenant) + PR4 remainder (submit wiring + queue linkage, queue UI stays in F4 5.1)

## Phase F3-PR1: Tallycore Theme Tokens (GAP-1 resolved) — spec: visual-shell "Light Tallycore theme tokens"

- [x] 4.1 RED `src/app/theme.tokens.test.ts` (reconciled the existing test in place rather than a parallel `theme/tokens.test.ts`): asserts every `visual-shell/spec.md` token value (`colorPrimary` `#0B5CD6`, `colorBgLayout` `#F4F6F9`, `colorBgContainer` `#FFFFFF`, `colorText` `#1A2332`, `colorTextSecondary` `#5A6B82`, `colorBorder` `#D9E0EA`, `colorSuccess`, `colorWarning`, `colorError` `#C0392B`, `borderRadius` `6`), pinned font-family stack + `12/14/16/20/24/30` scale, WCAG 2.2 AA ≥4.5:1 for all 8 text/bg pairs, recursive static scan for zero hardcoded hex/font/px-radius under `src/app/**` + `src/features/**` outside the theme module. RED confirmed: 5/14 failing against the old Datup values.
- [x] 4.2 GREEN replaced the obsolete Datup values in `src/app/tokens.ts` with the Tallycore set, mapped all of them (incl. `colorTextSecondary`, `fontSize`) through `src/app/theme.ts` keeping `components.Layout`; `src/app/providers.tsx` `ConfigProvider` already in place; wrote `src/app/theme/contrast-table.md`; renamed "Datup" → "Tallycore" in `tests/visual-shell.test.tsx` + `tests/theme.tokens.test.ts`. AA nudge: `colorSuccess` `#1F8A4C`→`#1C8449`, `colorWarning` `#B26A00`→`#A86400` (white text was 4.38/4.24:1). `npm run test:run` 251/251; typecheck/lint/fsd clean. commit `feat(theme): Tallycore AntD tokens with AA contrast table`

## Phase F3-PR2: Layout Primitives — spec: visual-shell (token-only styling, focus/target a11y)

- [x] 4.3 RED `src/shared/ui/primitives/{Modal,Drawer,Table,Progress}.test.tsx`: token-only styling (source scan for zero hex/radius literals), dialog semantics (`aria-modal`, focus restore, `Esc`, labelled close, scrim close), progressbar bounds + live-region text label, keyboard-reachable table scroll region, no business logic. RED confirmed: 4 files failed to resolve missing modules.
- [x] 4.4 GREEN implemented `Modal.tsx`, `Drawer.tsx`, `Table.tsx`, `Progress.tsx` as thin typed AntD wrappers (`Modal`/`Drawer` map `onClose`→`onCancel`/`onClose` + labelled `closable`; `Table` wraps AntD Table in a labelled focusable `overflow-x-auto` region; `Progress` derives percent from `value`/`max`, wrapper carries `role=progressbar` + bounds, `LiveRegion` announces `valueText`). No barrel file in `primitives/` — consumers import by path. `npm run test:run` 272/272; typecheck/lint/fsd clean. commit `feat(ui): Modal, Drawer, Table, Progress layout primitives`

## Phase F3-PR3: Status Primitives + Token Retheme — spec: visual-shell "Status not color-only", "Focus visible and targets sized"

- [x] 4.5 RED `src/shared/ui/primitives/{UnitBadge,ScannerTrigger}.test.tsx` + retheme assertions on `Button`, `NumericInput`, `SearchInput`, `Status`, `ItemCard`, `LiveRegion`: source-scan for zero hex/font-family/px-radius literal (new for `Button`/`NumericInput`/`SearchInput`/`ItemCard`/`LiveRegion`; `Status` already had an equivalent DOM-level hex check, extended with the same source-scan). All 6 files were already literal-clean — see apply-progress for evidence.
- [x] 4.6 GREEN add `UnitBadge.tsx` + `ScannerTrigger.tsx` (composed from `Button`/`Modal`/`SearchInput`/AntD `Input`, so styling/target-size/focus-ring inherit `ConfigProvider` tokens); no hardcoded-literal replacement needed in the 6 existing primitives (already token-only); commit `feat(ui): UnitBadge, ScannerTrigger primitives and token retheme`

## Phase F3-PR4: Guided + Manual Capture Screens — spec: guided-capture (both requirements), capture "Contract-exact ChangeInput"

- [x] 4.7 RED extended `src/features/capture/guided/GuidedCapture.test.tsx` (arrow prev/next + `Ctrl+K` open + `Esc` close, integration-level — the existing file already covered Enter-save-auto-advance, manual blind lookup, and 422 confirm-resend) + new `src/features/capture/manual/ManualCapture.test.tsx` (5 cases: starts empty until picked from `ScannerTrigger` search, blind pending lookup identity+unit only, `Ctrl+K` opens the scanner dialog, save stays on the line with no auto-advance, 422 confirm-resend with the identical exact string) + new `src/features/capture/change-input.test.ts` (5 cases: exact-string passthrough, authoritative-unit-wins, confirm-flag, default capture method, no mutation between initial send and resend)
- [x] 4.8 GREEN: extracted the `ChangeInput`/`CaptureChange` builder into `src/features/capture/change-input.ts` (`buildChangeInput` + `buildConfirmChange`, both re-exported from `useGuidedCapture.ts` for backward compatibility) and wired `saveCurrent` through it; composed `src/features/capture/manual/ManualCapture.tsx` from `ItemCard`/`NumericInput`/`Button`/`ScannerTrigger`/`Modal`/`LiveRegion`, reusing `useGuidedCapture(attemptId, 'manual')` (already starts empty / never auto-advances) for state; added `src/features/capture/i18n.ts` (`buildGuidedCaptureStrings` + `buildManualCaptureStrings`) and completed the `guidedCapture`/`manualCapture` namespaces in `src/app/i18n/es.json`; commit `feat(capture): guided and manual blind capture screens`. `GuidedCapture` (existed pre-slice, unwired to any route) keeps its own `mode==='manual'` branch as documented dead code — a future integration task should route `AttemptCapturePage` by `attempt.mode` to `GuidedCapture`/`ManualCapture` and drop that branch.

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
