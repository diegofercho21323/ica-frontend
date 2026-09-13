# Design: Admin Console — Users, Warehouses, Inventory Baseline, Assignment

> Status: `done` | Change: `admin-console` | Revision: `1`

## Technical Approach

Four capabilities ship as sibling slices of one FSD feature folder, `src/features/admin/{users,warehouses,inventory-baseline,assignment}/`, each pairing a screen + hook + tests with new port methods that are fully implemented in `mockInventoryApi` and stubbed `disabled()` in `http.ts` (the established swap-without-rewriting-features contract). They mount under a single `/admin` route subtree in `src/app/router.tsx`, gated **once** at the subtree root — not per screen. `src/features/admin/*` is a single dependency-cruiser feature (the `features-must-not-depend-on-other-features` rule captures `admin` as `$1`), so the four slices may share modules freely while staying unimportable from `bodegas`, `capture`, or `recount`. The baseline — the only privileged payload here — lives in its own isolated modules under `src/shared/api/inventory/baseline-*.ts`, off `InventoryApiPort`, guarded by a new dependency-cruiser rule shaped exactly like `leader-view-is-recount-authoring-only`.

## Architecture Decisions

| Decision | Options | Tradeoff | Decision + rationale |
|---|---|---|---|
| Route gating | (a) `/admin` subtree gated once; (b) `RequireRole` per screen | (a) one enforcement point, no drift; (b) each screen self-describing but N places to forget | **(a)**. `router.tsx` already nests a role-free `RequireAuth` layout route; `/admin` becomes a sibling child of it with its own gate. Four screens, four chances to forget one. |
| Where the gate component lives | (a) `src/features/admin/AdminRouteGate.tsx`; (b) `src/app/RequireAdminRoute.tsx` | (a) collocated with the feature but **fails `npm run fsd`** | **(b)**. `RequireRole` lives in `src/features/access/`; `features-must-not-depend-on-other-features` forbids `admin → access`. `src/app` may import features, so the composition (`<RequireRole allowedRoles={['demo-admin']}><Outlet/></RequireRole>`) belongs in the app layer. `RequireRole` takes `children`, not `Outlet` — the app wrapper supplies it, leaving `RequireRole` untouched. |
| Users / warehouses / assignment CRUD | (a) extend `InventoryApiPort`; (b) new `AdminApiPort` | (a) one port, but 3 × `disabled()` stub sites; (b) extra wiring | **(a)** — confirms the proposal. Every test double in the repo builds `{ ...mockInventoryApi, override }` (`RecountScreen.test.tsx:70`, `GuidedCapture.test.tsx:128`, `useSubmissionHistory.test.tsx:106`), so added methods cost zero test churn. Only `createHttpInventoryApi` and `disabledHttpInventoryApi` need new `disabled()` lines. |
| Baseline read/write methods | (a) same `InventoryApiPort`; (b) separate isolated `AdminBaselineApiPort` | (a) consistent, but any `useInventoryApi()` consumer can call `api.uploadBaseline()` / `getBaseline()` and infer expected quantities **without an import edge**, so the dependency rule never fires | **(b)** — narrow pushback on the proposal. Structural typing defeats module isolation if the method hangs off the shared port. `baseline-port.ts` + `baseline-mock.ts` sit beside `baseline-models.ts` inside the rule's protected `to` set; the baseline slice imports `mockAdminBaselineApi` directly, the same way `BodegasList` imports `mockInventoryApi` today. |
| CSV parsing | (a) `papaparse` on the main thread; (b) `worker: true`; (c) defer to backend | MVP files are a few hundred rows; a worker buys nothing and costs a bundle chunk + async test surface | **(a)**, with a `MAX_BASELINE_ROWS = 5000` guard that rejects oversized files with a typed error instead of janking. papaparse supports `worker: true` as a one-flag escalation if real files ever grow — no infrastructure is foreclosed. |
| Baseline versioning | (a) append-only list per warehouse; (b) single record + `version` field overwritten | (b) silently destroys the prior snapshot — the proposal requires retention | **(a) plus an explicit `version` field**, mirroring `lockRecord` in `mock.ts:97-106` (`v: record.versions.length + 1`, `versions.push`). `getBaseline(warehouseId)` returns the latest; `listBaselineVersions` returns all, newest first. |
| Isolation rule | exact `from`/`to` patterns | — | `from.pathNot: '^(src/features/admin/inventory-baseline/\|src/shared/api/inventory/)'`, `to.path: '^src/shared/api/inventory/baseline-(models\|port\|mock)\\.ts$'`, `severity: 'error'`. Written against the folder the change actually creates — the pre-existing `recount-authoring` mismatch is the cautionary precedent. |

## Data Flow — CSV baseline upload (highest risk)

```
Admin            BaselineUploadScreen      parseBaselineCsv        mockAdminBaselineApi        baselines Map
  │  select file        │                        │                          │                       │
  ├────────────────────>│                        │                          │                       │
  │                     ├── Papa.parse(file, {header:true}) ──>│            │                       │
  │                     │                        ├─ reject >5000 rows       │                       │
  │                     │                        ├─ require code/name/unit/expectedQuantity         │
  │                     │                        ├─ expectedQuantity kept as EXACT STRING            │
  │                     │<── ParseResult{rows|errors} ─────────┤            │                       │
  │<── row/error preview┤                        │                          │                       │
  │  confirm            │                        │                          │                       │
  ├────────────────────>├── uploadBaseline(warehouseId, rows) ────────────> │                       │
  │                     │                        │            version = list.length + 1             │
  │                     │                        │            list.push(record)  ──────────────────>│
  │                     │<── BaselineVersion{version, rowCount, capturedAt} ─┤   (prior versions
  │<── "v{n} stored" ───┤                        │                          │    retained, never
  │                     │                        │                          │    mutated)
```

Operator read path, by construction:

```
BodegasList / GuidedCapture / ReviewScreen
        │  useInventoryApi() → InventoryApiPort
        │  (carries NO baseline method — nothing to call)
        ▼
  listScopes / listAssignedScopes / getOperatorLines / getReview
        ╳  baseline-models.ts · baseline-port.ts · baseline-mock.ts
           └─ COMPILE-TIME GATE: `npm run fsd` (dependency-cruiser,
              tsPreCompilationDeps:true) fails the build on any import
              edge — including `import type` — from outside
              src/features/admin/inventory-baseline/ or src/shared/api/inventory/.
```

The gate is primarily **compile-time**: the violation is caught by `npm run fsd` at CI/build, before any runtime path exists, and a type-only import cannot evade it because `tsPreCompilationDeps` is on. The runtime absence (no baseline method on `InventoryApiPort`) is the second, independent layer — neither alone is trusted.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/RequireAdminRoute.tsx` | Create | Route-layer gate: `RequireRole allowedRoles={['demo-admin']}` wrapping `<Outlet/>`. |
| `src/app/router.tsx` | Modify | `/admin` child of the `RequireAuth` layout → `RequireAdminRoute` → `admin/users`, `admin/warehouses`, `admin/baseline`, `admin/assignments`. |
| `src/pages/screens.tsx` | Modify | Four thin page components following the existing `BodegasPage` pattern. |
| `src/app/i18n/es.json` | Modify | `admin.*` keys (labels, errors, CSV validation messages, unauthorized label). |
| `src/features/admin/users/{AdminUsersScreen.tsx,useAdminUsers.ts,*.test.tsx}` | Create | User CRUD over `Table` + AntD form controls. |
| `src/features/admin/warehouses/{AdminWarehousesScreen.tsx,useAdminWarehouses.ts,*.test.tsx}` | Create | Warehouse CRUD/deactivate with `companyId`. |
| `src/features/admin/inventory-baseline/{BaselineUploadScreen.tsx,parseBaselineCsv.ts,useBaselineUpload.ts,*.test.tsx}` | Create | File input, parse/validate, preview, confirm, version list. Only folder allowed to import `baseline-*`. |
| `src/features/admin/assignment/{AssignmentScreen.tsx,useAssignments.ts,*.test.tsx}` | Create | `{userId, warehouseId}` link management. |
| `src/shared/api/inventory/admin-models.ts` | Create | `AdminUser`, `WarehouseInput`, `AdminWarehouse`, `AssignmentRecord`. Not isolated — these are catalogs, not privileged quantities. |
| `src/shared/api/inventory/baseline-models.ts` | Create | `BaselineRow`, `BaselineVersion` — isolated module, `leader-models.ts` pattern, with the same explanatory header comment. |
| `src/shared/api/inventory/baseline-port.ts` | Create | `AdminBaselineApiPort`, deliberately separate from `InventoryApiPort`. |
| `src/shared/api/inventory/baseline-mock.ts` | Create | `mockAdminBaselineApi` — in-memory `Map<warehouseId, BaselineVersion[]>`, append-only. |
| `src/shared/api/inventory/port.ts` | Modify | User/warehouse/assignment methods + `listAssignedScopes`. No baseline method. |
| `src/shared/api/inventory/mock.ts` | Modify | Module-level `Map`s for users/warehouses/assignments; cleared in `resetDemo`. |
| `src/shared/api/inventory/http.ts` | Modify | New methods as `disabled()` in both `createHttpInventoryApi` and `disabledHttpInventoryApi`; add `disabledHttpAdminBaselineApi`. |
| `src/shared/api/inventory/fixtures.ts` | Modify | Seed `AdminUser`s (matching `demoCredentials`) and `active`/`companyId` for the 3 scopes. |
| `src/features/bodegas/BodegasList.tsx` | Modify | `listScopes()` → `listAssignedScopes(userId)`; zero assignments → existing `app.emptyWarehouses` empty state (fail closed). |
| `dependency-cruiser.js` | Modify | Add `baseline-is-admin-baseline-only` (patterns above). |
| `package.json` | Modify | `papaparse` (MIT, ~45KB min) + `@types/papaparse` (dev). |

## Interfaces / Contracts

```ts
// admin-models.ts
export type AdminUser = { id: string; displayName: string; role: DemoRole; active: boolean }
export type AdminUserInput = Omit<AdminUser, 'id'>
export type AdminWarehouse = InventoryScope & { companyId: string; active: boolean }
export type AdminWarehouseInput = Omit<AdminWarehouse, 'id'>
export type AssignmentRecord = { userId: string; warehouseId: string; assignedAt: string }

// port.ts — added to InventoryApiPort
listAdminUsers(): Promise<AdminUser[]>
createAdminUser(input: AdminUserInput): Promise<AdminUser>
updateAdminUser(id: string, input: Partial<AdminUserInput>): Promise<AdminUser>
deactivateAdminUser(id: string): Promise<AdminUser>
listAdminWarehouses(): Promise<AdminWarehouse[]>
createWarehouse(input: AdminWarehouseInput): Promise<AdminWarehouse>
updateWarehouse(id: string, input: Partial<AdminWarehouseInput>): Promise<AdminWarehouse>
deactivateWarehouse(id: string): Promise<AdminWarehouse>
listAssignments(warehouseId?: string): Promise<AssignmentRecord[]>
assignWarehouse(userId: string, warehouseId: string): Promise<AssignmentRecord>
unassignWarehouse(userId: string, warehouseId: string): Promise<void>
listAssignedScopes(userId: string): Promise<InventoryScope[]>   // operator read path

// baseline-models.ts — ISOLATED
export type BaselineRow = {
  code: string; name: string; unit: string
  /** Exact decimal string, never a number — same rule as `currentQuantity`. */
  expectedQuantity: string
}
export type BaselineVersion = {
  warehouseId: string; version: number; capturedAt: string
  source: 'csv' | 'manual' | 'api'; rows: BaselineRow[]
}

// baseline-port.ts — ISOLATED, NOT part of InventoryApiPort
export interface AdminBaselineApiPort {
  uploadBaseline(warehouseId: string, rows: BaselineRow[], source: BaselineVersion['source']): Promise<BaselineVersion>
  getBaseline(warehouseId: string): Promise<BaselineVersion | null>          // latest
  listBaselineVersions(warehouseId: string): Promise<BaselineVersion[]>       // newest first
}
```

Errors reuse `HttpError` with typed codes: `USER_NOT_FOUND`, `WAREHOUSE_NOT_FOUND`, `DUPLICATE_ASSIGNMENT`, `BASELINE_ROWS_EXCEEDED`, `BASELINE_ROW_INVALID`.

## Testing Strategy

Strict TDD (`strict_tdd: true`): every row below is a RED test written before its production module.

| Layer | What to test | Approach |
|---|---|---|
| Unit — parser | Header validation, missing/extra columns, empty file, `>5000` rows, quantity kept as exact string (`"10.50"` never `10.5`), CRLF/BOM | Vitest over `parseBaselineCsv` with inline CSV fixtures; no DOM. |
| Unit — mock port | CRUD round-trips, deactivate is a flag not a delete, duplicate assignment rejected, `resetDemo` clears every new `Map` | Vitest against `mockInventoryApi` / `mockAdminBaselineApi`. |
| Unit — versioning | Second upload yields `version: 2` and leaves v1 byte-identical | Assert on `listBaselineVersions` after two uploads. |
| Integration — routing | `demo-admin` reaches each admin route; `operator` and `cost-leader` see the unauthorized label and the screen never mounts (no port call fires) | RTL + `MemoryRouter` + `SessionProvider`; spy port asserts zero calls. |
| Integration — screens | Create/edit/deactivate flows, CSV upload preview → confirm, assignment add/remove | RTL + `user-event` + `{ ...mockInventoryApi, override }` doubles. |
| Integration — operator filter | Assigned-only list; zero assignments → `app.emptyWarehouses`, never the full list | RTL over `BodegasList` with seeded assignments. |
| Architecture | Operator import of `baseline-*` fails | `npm run fsd`; plus one committed temporary-violation check in the task list proving the rule actually fires before the slice lands. |
| E2E | Deferred — `e2e/` is empty repo-wide | Out of scope for this change. |

## Threat Matrix

Canonical rows (routing/shell/VCS): **Documentation-like paths** — N/A, no file is classified or executed; the CSV is parsed as data, never evaluated. **Git repository selection / Commit state / Push state / PR commands** — N/A, this change spawns no subprocess, shell, or VCS automation.

Applicable application-boundary rows:

| Boundary | Adversarial case | Design response | Planned RED test |
|---|---|---|---|
| Route authorization | `operator`/`cost-leader` navigates directly to `/admin/users`; unauthenticated deep link | `RequireAuth` redirects first; `RequireAdminRoute` blocks the subtree; children never mount, so no admin query fires | Render `/admin/*` per role; assert unauthorized label **and** zero port calls |
| Blind-count integrity (product-critical) | Operator-facing module imports `baseline-models.ts` — including `import type` | Module isolation + dependency-cruiser `error` + `tsPreCompilationDeps: true`; baseline is not reachable through `InventoryApiPort` at all | `npm run fsd` fails on a deliberate violating import; port type test asserts `InventoryApiPort` has no baseline member |
| Expected-quantity leakage via types | Structural typing exposes `expectedQuantity` to an operator screen with no import edge | Baseline methods live on the separate `AdminBaselineApiPort`; `useInventoryApi()` cannot reach them | Typecheck test: calling a baseline method off `useInventoryApi()` does not compile |
| Untrusted CSV input | 100MB file, 1M rows, malformed rows, `=cmd()` formula-injection cell | Row cap + per-row schema validation; values rendered as text, never as formulas or HTML; rejection is a typed error with a row-level report | Parser tests for oversized/malformed input; render test asserts a formula-looking cell is displayed verbatim as text |
| Decimal precision | `expectedQuantity` coerced to `number` by the parser | `dynamicTyping: false`; string-only contract mirrored from `currentQuantity` | Parser test asserting `"10.50"` survives unchanged |

## Migration / Rollout

No data migration: every store is in-memory mock state created empty and cleared by `resetDemo`. All four slices are additive; only `BodegasList` alters an operator-facing read, and that is a one-line swap reverted by restoring `listScopes()`. Ship in proposal order (users → warehouses → baseline → assignment) as four independently revertible PRs, each ≤400 lines. Rollback = delete the `/admin` route subtree and the feature folder; the new port methods go unreferenced and HTTP stays `disabled()`. The dependency-cruiser rule may stay after a rollback — it is inert once `baseline-*.ts` is also deleted, and harmless if the modules remain.

## Open Questions

- [ ] Are `cost-leader` users assignable to warehouses, or is assignment operator-only? Design assumes any non-admin role is assignable; the spec must state it.
- [ ] Deactivating a warehouse with live assignments: cascade-unassign, or block with `WAREHOUSE_HAS_ASSIGNMENTS`? Design assumes deactivation hides it from `listAssignedScopes` and leaves the records intact.
- [ ] Should `AdminUser.id` reconcile with `demoCredentials.userId` (seeded fixtures) or be an independent sequence? Design assumes seeded from `demoCredentials` so assignment can target existing demo logins.
- [ ] Does the baseline CSV need a company/tenant column, or is `warehouseId` chosen in the UI sufficient? Design assumes the latter.

---
<!-- gentle-ai:sdd-design/v1 revision=1 outcome=done -->
