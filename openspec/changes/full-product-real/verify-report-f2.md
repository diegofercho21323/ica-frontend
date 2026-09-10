# Verification Report — F2 HTTP Contract + Auth + Tenancy (full-product-real)

- Change: `full-product-real` (F2 epic, task 3.1: PR3 foundation + PR4 submit/queue remainder)
- Mode: STRICT TDD active, runner `npm run test:run`; stacked-to-main slices
- Attempt ledger: proceed token `sha256:58a52278ca4462028aef1c0003a9416b2bcd48d350ce0f7b27de08f0912acebb` (F2-VERIFY)
- Scope: `openspec/changes/full-product-real/specs/http-inventory-adapter/spec.md`,
  `tenant-context/spec.md`, `submission-queue/spec.md`, `access` delta, `app-shell` delta;
  tasks.md F1-PR1/PR2 [x], F2 3.1 [x]
- Verdict: **PASS WITH WARNINGS** (F2 green; 11 failures + 2 typecheck errors all owned-by-later, 1 unchecked refactor task)

## 1. Completeness (tasks)

| Task | State | Evidence |
|------|-------|----------|
| 1.1 RED attempt-scoped cases | [x] | `mock.saveBatch.test.ts`, commits 2a9cafc/8353925 |
| 1.2 GREEN per-attempt ledger | [x] | `port.ts` + `mock.ts` scoped `saveBatch(attemptId, idempotencyKey, changes)` |
| 1.3 REFACTOR closeLoop + repo-wide green | [ ] unchecked | Commits landed; downstream callers still RED — owned-by-later migration, tracked explicitly in `src/app/inventory.test.ts` allowlist. **WARNING** (cleanup, not core) |
| 2.1–2.3 Providers + adapter swap | [x] | `src/app/inventory.ts`, `api-context.tsx`, `useCaptureForm.ts` scoped keys; commits 0ca8dea/9d7f4b0 |
| 3.1 HTTP contract + auth + tenancy (PR3 e460ed8/4c5336a + PR4 74abb77/ca48375) | [x] | `http.ts` (App. A DTOs, `Idempotency-Key`, 6 codes, submit), `auth-token.ts`, `SessionContext.tsx` token flow, `tenant-catalog.ts`, `submission-queue.ts` pure linkage |

F2-VERIFY scope (3.1) is complete. The single unchecked task (1.3) is a refactor/migration cleanup owned by later phases, not an F2 core task.

## 2. Build / tests / coverage evidence (observed, not inferred)

| Command | Result (observed) |
|---------|-------------------|
| `npm run test:run` (full) | **161/172 pass; 11 fail** across 5 files — exact known allowlist, zero new |
| `npm run test:run -- http.contract.test.ts http.submit.test.ts submission-queue.test.ts tenant-catalog.test.ts SessionContext.test.ts` | **43/43 pass** (5 files) |
| `npm run test:run -- src/app/inventory.test.ts mock.saveBatch.test.ts mock.closeLoop.test.ts` | **23/23 pass** (3 files) |
| `npm run lint` | clean, exit 0 |
| `npm run typecheck` | 2 errors, both pre-existing F4: `ReviewScreen.test.tsx(77,28)` + `(110,28)` TS2554 arity (untracked another-slice files, not F2) |
| `npm run fsd` (dependency-cruiser) | clean — 81 modules, 253 dependencies, no violations |
| Smoke `curl localhost:5173 / 192.168.1.254:5173` | **200 / 200** (dev server PID 905692, no new server raised) |

Full-suite failures (all owned-by-later, pre-existing):
`tests/blind-safety.contract.test.ts` (1, fake-id), `tests/inventory.contract.test.ts` (4, fake-id),
`ReviewScreen.test.tsx` (2, F4 arity), `DashboardKpis.test.tsx` (2, dashboard fixture),
`tests/app.smoke.test.tsx` (2, legacy /capture). Dirty tree (`es.json`, `router.tsx`,
`BodegasList`, `CaptureTable`, `screens.tsx`, untracked `attempts/`) belongs to another
in-progress slice and was left untouched.

## 3. Spec compliance matrix (requirement → verdict → runtime evidence)

### http-inventory-adapter (3 reqs / 7 scenarios)

| Requirement / scenario | Verdict | Evidence |
|---|---|---|
| Config-driven adapter selection | **PASS** | `resolveInventoryApi` mock-default + unknown→mock+warn; `inventory.test.ts` green |
| — Mock default resolves | PASS | covered test, zero network |
| — HTTP flagged on | PASS | resolves `HttpInventoryApiAdapter` vs `/api/{SERVICE}/ica-inventory`; disabled without `VITE_INVENTORY_API_URL` (never hardcoded) |
| — No direct backend imports in features | PASS | audit test green with explicit 4-file owned-by-later set; F2 files (`SessionContext`, `useCaptureForm`, `tenant-catalog`) consume the port only; no `axios` under `features/` |
| HTTP contract parity (App. A) | **PASS** | `toChangeInput`/`toBatchBody` exact-string quantity + unit + `capture_method` + `confirm_unusual_quantity`; `GUIDED`/`MANUAL` uppercase via `toAttemptMode` |
| — Batch sends exact strings with key | PASS | `http.contract.test.ts`: `"10.10"` verbatim + single `Idempotency-Key` header on batch AND submit; no `Number()`/`parseFloat` in http/queue/tenant paths (grep-verified) |
| — 409 typed, never auto-retries | PASS | `toHttpError` maps 400/401/403/404/409/422; `isAutoRetryBlocked` blocks conflict+synced; `retryRequestFor` returns null on conflict; no retry path in adapter |
| Mock stays as regression harness | **PASS** | mock selectable by config; `mock.saveBatch` + `mock.closeLoop` green, no network |

### tenant-context (1 req / 2 scenarios)

| Requirement / scenario | Verdict | Evidence |
|---|---|---|
| Tenant-scoped catalog | **PASS** | `filterScopesByCompany` keyed by `scope_key`; `tenant-catalog.test.ts` green |
| — Company switch filters scopes | PASS | covered test |
| — session_id links the loop | PASS | `historyQueryKey`: queries by `session_id` when present, never bare-`attempt_id` inference; optional until POST /sessions lands (GAP-4, explicit) |

### submission-queue (1 req / 3 scenarios)

| Requirement / scenario | Verdict | Evidence |
|---|---|---|
| Explicit queue states | **PASS** | `QUEUE_STATUS_META` text+icon per state (never color-only); `submission-queue.test.ts` green |
| — Failed retry reuses key | PASS | `retryRequestFor` reuses entry key; submit path sends `Idempotency-Key`; same-key replay covered in `http.submit.test.ts` |
| — 409 never auto-resolves | PASS | `isAutoRetryBlocked(conflict) === true`; recovery only via deliberate `authorizeReplacementKey` flow |
| — Locked attempts never edited | PASS | `canMutateAttempt(locked) === false`; locked-immutable covered |

### access delta (2 reqs / 5 scenarios)

| Requirement / scenario | Verdict | Evidence |
|---|---|---|
| Token login (MODIFIED) | **PASS** | `POST auth/token` form email+password → `{access_token, token_type}`; `GET auth/me` role; token+expiry only persisted |
| — Valid token login per role | PASS | `SessionContext.test.tsx` green |
| — Invalid credentials stay with error | PASS | inline Spanish error via `t()`, stays on `/login` |
| — Password/token hygiene | PASS | password never stored; expired token purged on boot + on 401 (`throwForStatus` clears store); logout clears token + session |
| RequireRole mirrors server (ADDED) | **PASS** | UX-mirror gates; unknown server role → 403 via `toDemoSession`; 403/401 surfaced via `t()` with re-login path |
| — Non-leader blocked with message | PASS | no recount mutation fires; server enforces |
| — Expired session re-logins | PASS | 401 → store cleared → `/login` + `t()` message |

### app-shell delta (2 reqs / 4 scenarios)

| Requirement / scenario | Verdict | Evidence |
|---|---|---|
| Adapter + session providers (ADDED) | **PASS** | `app/providers` + `InventoryApiProvider`; config flip mock↔http needs zero `features/` edits; router guards redirect to `/login` |
| — Config swap needs no feature edits | PASS | covered by audit test |
| — Session gates visible capabilities | PASS | protected nav hidden without session |
| Localized shell strings (MODIFIED) | **PASS** | shell via `t()`; `es` complete; additive locales only (no existing-bundle edits in F2 diff) |

Totals: **9 requirements / 21 scenarios — 9 PASS, 0 FAIL**.

## 4. Correctness spot-checks (code vs spec details)

- App. A DTOs: `line_id`, exact-string `quantity`, exact `unit`, `capture_method`, `confirm_unusual_quantity`; only `NOT_FOUND` travels explicitly — matches spec.
- `Idempotency-Key` header on both `saveBatch` and `submit` — verified by grep (http.ts:251,266).
- 6 codes mapped, unmapped statuses return `null` (client never invents a code) — matches spec.
- Token-only storage, `AUTH_TOKEN_TTL_MS` expiry, boot purge, 401 purge — matches spec.
- `toSubmitReceipt` verbatim (`key`, terminal `SUCCEEDED`/`FAILED`, `payload_hash`, `erp_reference` null while FAILED); receipt without `payload_hash` rejected — matches spec.
- Blind-safety: quantities exact strings end to end; tenant mapping invents no server fields (explicit passthrough).
- Decimal-exacto: `9007199254740993.000001` verbatim case in mock suite; no float coercion in F2 paths.
- FSD: `features/` import only `port`/`models`/`api-context` (plus 4 owned-by-later source violators, allowlisted in-test); `fsd` clean.

## 5. Issues

- **WARNING** — task 1.3 unchecked (REFACTOR migration, downstream callers still import mock directly). Tracked in `inventory.test.ts` allowlist; owned by later phases. Does not block F2.
- **WARNING** — full suite 11/172 red + 2 typecheck errors, all pre-existing owned-by-later (fake-id contract/dashboard, legacy /capture smoke, F4 ReviewScreen arity). Zero new failures introduced by F2 (F1-PR2 baseline identical).
- **SUGGESTION** — close GAP-4 (backend URL/CORS/auth contract, read endpoints PRD §23, POST /sessions `session_id`) before F3–F5 need live reads; until then HTTP stays correctly disabled-by-default.
- **SUGGESTION** — F4 owns queue UI/receipt display; F2 linkage (`submission-queue.ts` pure helpers) is correctly UI-free.

## 6. Result contract

- `status`: PASS WITH WARNINGS
- `executive_summary`: F2 (task 3.1, PR3+PR4) verified green — App. A DTOs, Idempotency-Key, 6-code typed errors, token-only auth, tenant catalog with session_id linkage, and queue linkage without auto-resolve all have passing runtime tests (43/43 focused + 23/23 adapter/mock). Full suite 161/172 with the exact 11 pre-existing owned-by-later failures; lint + fsd clean; typecheck shows only 2 pre-existing F4 arity errors; smoke 200/200 on both hosts.
- `artifacts`: this file (`openspec/changes/full-product-real/verify-report-f2.md`) + engram `sdd/full-product-real/verify-report-f2`
- `next_recommended`: F3 (capture primitives + guided, gate: brand token values) — no fix required before proceeding; 1.3 migration shrinks naturally as F3–F5 migrate their features off direct mock imports
- `risks`: GAP-4 backend contract still unpublished (reads/session_id live wiring blocked); dirty tree from another slice (es.json, router, BodegasList, CaptureTable, screens, attempts/) is uncommitted and out of F2 scope — must not be attributed to F2
- `skill_resolution`: frontend-design applied — FSD layer isolation confirmed via `fsd` clean + import-audit test; state via providers/context (no global UI store); queue status text+icon (a11y, never color-only); no inline-style/DOM violations in F2 files
