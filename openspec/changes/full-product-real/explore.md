# Exploration: full-product-real

## Quick path

1. Today's product is a mock-first hackathon MVP (blind count, close-loop PR1 green, PR2 UI exists with desynced tasks).
2. "Real" means: real backend contract + multi-tenant auth + per-company calibration + guided UX + design system + offline/PWA + observability.
3. Do NOT attempt this as a single PR — split into a phased roadmap starting with a proposal.

## Current State

Blind-count flow works against `InventoryApiPort` with `MockInventoryApiAdapter` as the only functional backend:

- `src/shared/api/inventory/port.ts` — typed port (`loginDemo`, `listScopes`, `startAttempt`, `getOperatorLines`, `saveBatch`, `getReview`, `finalize`, `submit`, `getHistory`, `createRecount`).
- `src/shared/api/inventory/mock.ts` — in-memory store (`Map<attemptId, AttemptRecord>`, idempotency ledgers, blind v2 recount, role gate `cost-leader`). Deterministic, no persistence, no network.
- `src/shared/api/inventory/http.ts` — `disabledHttpInventoryApi`: every method throws. Axios client exists but is unwired.
- `src/features/bodegas/BodegasList.tsx` — scope list + mode radio + `startAttempt` → `/capture/:attemptId`. Calls mock directly (not yet via Query-swappable adapter selection in `app/`).
- `src/features/capture/CaptureTable.tsx` + `useCaptureForm` — batch table with blind rule (`NOT_COUNTED` hides quantity), idempotency key per save, locked read-only.
- `src/features/attempts/ReviewScreen.tsx` + `FinalizeDialog.tsx` — review (counted values / pending identity+unit only), 422-confirm-then-lock.
- `src/pages/screens.tsx` + `src/app/router.tsx` — thin pages (`Login`, `Dashboard`, `Bodegas`, `Capture`, `AttemptCapture`, `Review`). No recount/history/submission-queue routes yet (those live in close-loop PR3/PR4 tasks, unimplemented).
- `docs/PRD.md` v1.1 (25 chapters) — verified backend contract appendix, blind-count domain rules, explicit non-goals (no real Oracle, no variance analytics, no multi-user offline reconciliation).
- `openspec/specs/` — `access`, `app-shell`, `bodegas-list`, `capture`, `dashboard-kpis`, `public-routes`, `visual-shell`. Close-loop adds `attempt-review`, `attempt-submission`, `attempt-history`, `attempt-recount` as change-local specs (not yet promoted).
- Prior state: bodegas + capture merged, close-loop PR1 green (mock foundation + contract tests), PR2 UI code exists but `frontend-close-loop/tasks.md` still marks PR2/PR3/PR4 unchecked.

What "mock-first" concretely means today: 3 hardcoded scopes, 5-line fixture, 3 demo logins (`operador`/`lider`/`admin`), no tenant, no real session/token, no per-company catalog, no persistence across reload, no backend URL/CORS/env.

## Affected Areas

- `src/shared/api/inventory/http.ts` — enable real adapter (baseURL, auth interceptors, error mapping to `HttpError`, idempotency headers).
- `src/shared/api/inventory/port.ts` + `models.ts` — extend toward PRD contract (`GUIDED`/`MANUAL` uppercase, `snapshot_id`/`warehouse_id`, `session_id`, barcode routes, `ChangeInput` with `unit`/`capture_method`/`confirm_unusual_quantity`, `Receipt` with `payload`/`payload_hash`/`erp_reference`).
- `src/app/` (providers, router, i18n config) — adapter selection by config, auth session provider (token storage/expiry/clear), `RequireRole` for leader routes, locale expansion.
- `src/features/access/` — real login (no demo passwords persisted), role-gated actions (operator submit vs leader recount).
- `src/features/bodegas/`, `src/features/capture/`, `src/features/attempts/`, new `src/features/recount/` + `src/features/submission/` — per-company flows, guided capture, queue/badge, history.
- `src/shared/ui/primitives/` + `src/shared/ui/layout/` — design tokens (Colsubsidio identity), `Button/NumericInput/SearchInput/Modal/Drawer/Status/Progress/Table/ItemCard/UnitBadge/ScannerTrigger/LiveRegion`, responsive shell (sidebar → drawer < lg).
- `src/shared/lib/` — `idempotency.ts`, `submission-queue.ts`, `persistence.ts` (versioned keys, `resetDemo`, offline outbox).
- `openspec/specs/` + `openspec/changes/full-product-real/` — new/updated specs for multi-tenant, HTTP parity, UX system.

## Approaches

1. **A — Continue mock-first (incremental demo polish)**
   - Finish close-loop PR2→PR4 on mocks, polish demo script, defer backend.
   - Pros: small reviewable PRs (~250 lines each); keeps Strict TDD green; zero backend dependency; demo-ready fast.
   - Cons: never becomes "real"; multi-company/auth/persistence gaps remain; mock/contract drift grows; user explicitly rejects "only mocked tests".
   - Effort: Low (days, within existing 4-PR plan).

2. **B — Real multi-company product (backend + design system + intuitive UX)**
   - Wire `HttpInventoryApiAdapter` to a published ica-backend, add multi-tenant auth, per-company calibration, guided flows, tokens/a11y/responsive/i18n, offline queue, observability.
   - Pros: matches the stated goal (any company, visibly working, not mocked); closes PRD §23 dependencies; unlocks production path.
   - Cons: very large scope; hard backend dependencies (URL, CORS, auth, `session_id`, read endpoints, role alignment); requires design validation with Colsubsidio; cannot fit review budgets.
   - Effort: High (weeks, phased roadmap of chained PRs).

### Recommendation

Recommend **B as the direction, executed as a phased program — not as one change**. Keep A only as the demo fallback while B's backend dependencies land. The immediate next step is a proposal that splits B into sequenced changes (contract parity → auth/tenancy → capture UX → close-loop → offline/PWA → observability), each with its own spec/design/tasks and 400-line-budget PR chain.

## What "Real" Means Here

| Dimension | Today (mock) | "Real" requires |
|-----------|--------------|-----------------|
| Backend | `mock.ts` in-memory | Published ica-backend URL + CORS + env config; `HttpInventoryApiAdapter` fully implemented; PRD App. A contract conformance (prefix `/api/{SERVICE}/ica-inventory`, DTOs, error codes 400/403/404/409/422, idempotency headers) |
| Auth | `loginDemo` hardcoded | Real token flow (`POST auth/token` → `GET auth/me` or SSO); secure storage/expiry/clear; session validation gating visible capabilities |
| Multi-tenant | 3 static scopes, 1 fake company | Tenant/company context (select or claim-derived); per-company scopes/catalog; `session_id` linking start→history→recount; read endpoints for assignments/versions/receipts (PRD §5 gap) |
| Calibration per company | One 5-line fixture | Per-company catalog import (units, `soft_limit_quantity`, precision rules), snapshot lifecycle, seed/migration story |
| Roles | `currentRole` string flag, leader gate only on recount | Server-enforced authorization (submit restricted to operator, recount to `ICA_COST_LEADER_EMAILS`); frontend `RequireRole` mirrors but never replaces it; operator catalog for `assignee` (today free string) |
| Capture UX | Generic table | Guided one-line-at-a-time assistant + manual mode, keyboard-first shortcuts (`Enter`, `Ctrl+K`, arrows, `Esc`), barcode/manual-add, advisory confirm, blind-safety tests |
| Design system | Raw Ant Design defaults | Colsubsidio-based Ant tokens (primary/bg/surface/text/focus/success/warning/error), no invented hex/logo/fonts; pending brand validation |
| Offline/PWA | None | Installable shell, versioned local queue (attempt+body+key) with synced/pending/conflict states; no auto-resolve of 409; no editing server-locked attempts |
| Observability | None | Contract/timing telemetry (capture <5s aspiration), unit-error rate, retry/replay counts, submission receipts; error/live-region announcements |
| Data integrity | djb2 mock hash, ephemeral | Server `payload_hash` verification, replay-with-same-key semantics, immutable versions, receipt surfacing (full vs abbreviated TBD per PRD §23) |

## UI/UX Gaps (frontend-design lens)

| Area | Gap |
|------|-----|
| Design tokens | No semantic token layer; Ant defaults unmapped to Colsubsidio identity; brand validation pending (PRD §16) |
| Navigation | No guided onboarding (select company → warehouse → mode → capture → review → submit); recount/history routes missing; empty/loading/error states partial |
| Guided flows | Table-centric capture instead of one-line assistant; no stepper, progress, contextual help, or confirmation patterns for advisory/lock/submit |
| Accessibility | Foundations present (`aria-label`, `aria-busy`, `role=alert/status`) but no audited keyboard-only path, focus-trapped dialogs with restore, live-region coverage for submit/retry/conflict, non-color state encoding, WCAG 2.2 AA contrast proof |
| Responsive | `overflow-x` table + grid breakpoints exist; missing tablet-first targets (large touch controls), card fallback on small screens, drawer nav < lg verification |
| i18n | `t()` used in touched features; needs full-locale audit (no hardcoded strings), `es` complete + locale-additive structure, quantity display formatting vs exact-decimal-string editing, untranslated technical units/status codes |
| FSD hygiene | `BodegasList` imports mock directly (should consume port via `app/`-provided adapter); cross-feature imports must stay forbidden; server state must go through TanStack Query; Zustand only with demonstrated cross-screen need |

## Risks

- **Single-PR delivery for this scope will fail review**: the close-loop plan itself forecasts ~1000 lines across 4 PRs and flags 400-line budget risk High. Full-product-real is multiples of that (HTTP parity + auth + UX system + offline + telemetry). A single PR would be unreviewable, un-revertable, and break Strict TDD RED→GREEN traceability.
- **Backend dependency deadlock**: no published URL, CORS, auth contract, `session_id` on start, or read endpoints — HTTP work cannot be verified until these land (PRD §23). Building UI against assumed endpoints re-creates mock drift.
- **Authorization confusion**: frontend role gates are not security; shipping "multi-company roles" without server alignment creates a false safety story (PRD §5, §21).
- **Blind-safety regression**: any dashboard/progress/history feature can leak theoretical stock, prior counts, or variance — needs blind-safe models + failing tests, not just code review.
- **Decimal-integrity risk**: quantities are exact strings; any float coercion corrupts past-2^53 values (fixture `SKU-005` exists precisely for this). Real adapters/serializers must preserve strings end to end.
- **Brand/legal**: inventing Colsubsidio palette/logo/fonts before official validation.
- **Offline overpromise**: local queue ≠ multi-user reconciliation; auto-resolving 409 or editing server-locked attempts corrupts immutability.
- **Tasks desync**: close-loop PR2 UI exists while tasks.md shows unchecked — the proposal must reconcile actual vs recorded state before planning on top of it.
- **Scope creep into non-goals**: variance/ranking/demand/Oracle/scheduling are explicit PRD §22 non-goals; "works for any company" must not smuggle them back in.

## Details

| Topic | Decision |
|-------|----------|
| Scope | This explore only investigates; no proposal/spec/design/tasks created |
| Source of truth | `docs/PRD.md` v1.1 + verified backend contract appendix (App. A) |
| TDD note | Runner `npm run test:run` acknowledged; no tests implemented in this phase |
| Demo fallback | Keep mock adapter selectable by config even after HTTP lands (contract regression harness) |
| First unblock | Reconcile close-loop PR2 actual-vs-tasks state; confirm backend publish checklist (§23) ownership |

## Checklist

- [ ] Reader can state the difference between mock-first and real-product paths
- [ ] Reader can list what "real" concretely requires (table above)
- [ ] Reader can explain why single-PR is rejected (line budget + dependencies + TDD traceability)
- [ ] Next step is unambiguous: run `propose` for `full-product-real` with phased roadmap

## Next step

Run the `propose` phase for `full-product-real`: phased proposal with slice boundaries, per-slice PR chains, and explicit backend-dependency gates. Do not jump to spec/design/tasks.

---

## Result Contract

- **status**: complete
- **executive_summary**: The frontend is a mock-first blind-count MVP (typed port + in-memory adapter, HTTP stub disabled, bodegas/capture/review working, recount/history/queue pending, close-loop PR1 green with PR2 UI desynced from tasks). Becoming a real multi-company product requires a published backend contract, real auth + tenancy, per-company calibration, role-aligned authorization, a Colsubsidio design system, guided accessible responsive UX with full i18n, offline/PWA queueing, and observability. This cannot ship as a single PR; it needs a phased proposal with chained budget-compliant PRs gated on backend dependencies.
- **artifacts**:
  - Read: `docs/PRD.md`, `src/app/router.tsx`, `src/pages/screens.tsx`, `src/features/bodegas/BodegasList.tsx`, `src/features/capture/CaptureTable.tsx`, `src/shared/api/inventory/port.ts`, `src/shared/api/inventory/models.ts`, `src/shared/api/inventory/mock.ts`, `src/shared/api/inventory/http.ts`, `src/shared/api/inventory/fixtures.ts`, `openspec/specs/`, `openspec/changes/frontend-close-loop/tasks.md`, `openspec/changes/frontend-screens-v2/tasks.md`
  - Saved: `openspec/changes/full-product-real/explore.md` + engram topic `sdd/full-product-real/explore`
- **next_recommended**: propose
- **risks**: single-pr exceeds 400-line budget by multiples and is unreviewable; backend publish gaps (URL/CORS/auth/session_id/read endpoints) block HTTP verification; frontend roles are not server security; blind-safety/decimal-exactness/offline-409 regressions likely without contract tests; brand assets unvalidated; close-loop PR2 state desynced from tasks.
- **skill_resolution**: `frontend-design` applied (FSD layers, primitives, Query/state rules, a11y, responsive, i18n gaps assessed against `src/`); `cognitive-doc-design` applied (lead-with-answer, quick path, tables over prose, checklist, next step).
