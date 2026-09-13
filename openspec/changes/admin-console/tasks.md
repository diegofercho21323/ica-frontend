# Tasks: Admin Console — Users, Warehouses, Inventory Baseline, Assignment

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1900 total; ~150–380 per PR |
| 400-line budget risk | High (total) / Low-Medium (per slice) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (gate) → PR2 (users) → PR3 (warehouses) → PR4 (baseline port/isolation) → PR5 (baseline CSV UI) → PR6 (assignment) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| U1 (1.1–1.5) | Route-layer gate + empty `/admin` subtree | PR 1 | `npm run test:run -- src/app/RequireAdminRoute.test.tsx src/app/router` | RTL + `MemoryRouter`, nav to `/admin/*` per role, assert unauthorized label + zero port calls | delete `RequireAdminRoute.tsx` + revert `router.tsx` admin subtree |
| U2 (2.1–2.6) | `AdminUser` CRUD port+mock+http-stub+screen | PR 2 | `npm run test:run -- src/features/admin/users src/shared/api/inventory/mock` | RTL create/edit/deactivate flow against mock; nav test for gate reuse | `src/features/admin/users/` + user methods on `port.ts`/`mock.ts`/`http.ts` revert |
| U3 (3.1–3.6) | Warehouse CRUD (`active`,`companyId`) port+mock+http-stub+screen | PR 3 | `npm run test:run -- src/features/admin/warehouses src/shared/api/inventory/mock` | RTL create/edit/deactivate; `Table` primitive render check | `src/features/admin/warehouses/` + warehouse methods revert |
| U4 (4.1–4.7) | Isolated `AdminBaselineApiPort`+models+mock+depcruise rule | PR 4 | `npm run test:run -- src/shared/api/inventory/baseline` `npm run fsd` | `npm run fsd` against a committed-then-reverted violating import in a throwaway operator file | `src/shared/api/inventory/baseline-{models,port,mock}.ts` + depcruise rule revert |
| U5 (5.1–5.6) | CSV upload screen (`papaparse`) + versioning UI | PR 5 | `npm run test:run -- src/features/admin/inventory-baseline` | manual CSV upload against mock (valid + malformed-row file) | `src/features/admin/inventory-baseline/` + `papaparse` dep revert |
| U6 (6.1–6.7) | Assignment CRUD + `BodegasList` operator filter | PR 6 | `npm run test:run -- src/features/admin/assignment src/features/bodegas/BodegasList` | RTL: assign→`BodegasList` shows only assigned; zero assignments → empty state | `src/features/admin/assignment/` + assignment methods revert + restore `listScopes()` call in `BodegasList.tsx` |

## Phase 1: Shared Route Gate (PR 1) — spec: admin-users "Admin route gated to demo-admin" (foundation for all four capabilities)

- [ ] 1.1 RED `src/app/RequireAdminRoute.test.tsx`: `demo-admin` renders `<Outlet/>` children; `operator`/`cost-leader` render `RequireRole`'s unauthorized label and children never mount
- [ ] 1.2 GREEN create `src/app/RequireAdminRoute.tsx` — composes `RequireRole allowedRoles={['demo-admin']}` around `<Outlet/>`, per design (app layer, not `features/admin`, to satisfy `features-must-not-depend-on-other-features`)
- [ ] 1.3 RED extend `src/app/router.tsx` route test: `/admin` subtree (empty placeholder children) mounts under `RequireAdminRoute` as a sibling of the existing `RequireAuth` layout route
- [ ] 1.4 GREEN wire the `/admin` child routes (`admin/users`, `admin/warehouses`, `admin/baseline`, `admin/assignments`) in `src/app/router.tsx`, each a stub page from `src/pages/screens.tsx` until its own PR fills it in
- [ ] 1.5 Add `admin.unauthorized`/nav placeholder keys to `src/app/i18n/es.json`; `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run fsd` clean; commit `feat(app): admin route gate and empty /admin subtree`

## Phase 2: Admin Users (PR 2) — spec: admin-users (all three requirements)

- [ ] 2.1 RED `src/shared/api/inventory/mock.adminUsers.test.ts`: `listUsers`/`createUser`/`updateUser`/`deactivateUser` round-trip; deactivate sets `active:false`, never deletes; deactivated user's attempt history stays queryable
- [ ] 2.2 GREEN add `AdminUser`/`AdminUserInput` to `src/shared/api/inventory/admin-models.ts` (new file); add the four methods to `InventoryApiPort` (`src/shared/api/inventory/port.ts`); implement fully in `src/shared/api/inventory/mock.ts` with a module-level `Map`, cleared in `resetDemo`; seed fixtures in `src/shared/api/inventory/fixtures.ts` matching `demoCredentials`
- [ ] 2.3 RED `src/shared/api/inventory/http.adminUsers.test.ts`: all four methods throw `HTTP_DISABLED_MESSAGE` and fire zero network calls on both `createHttpInventoryApi` and `disabledHttpInventoryApi`
- [ ] 2.4 GREEN add the four `disabled()` stubs to `src/shared/api/inventory/http.ts`
- [ ] 2.5 RED `src/features/admin/users/AdminUsersScreen.test.tsx`: create/edit/deactivate flow via `{ ...mockInventoryApi, override }`; reuses `RequireAdminRoute` gate — non-admin sees unauthorized label, zero mutation calls
- [ ] 2.6 GREEN implement `src/features/admin/users/{AdminUsersScreen.tsx,useAdminUsers.ts}`, wire `admin/users` route in `router.tsx` to the real screen, add `admin.users.*` i18n keys; `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run fsd` clean; commit `feat(admin): user CRUD screen`

## Phase 3: Admin Warehouses (PR 3) — spec: admin-warehouses (all four requirements)

- [ ] 3.1 RED `src/shared/api/inventory/mock.adminWarehouses.test.ts`: `createScope`/`updateScope`/`deactivateScope` round-trip against extended `InventoryScope{active,companyId}`; deactivated warehouse excluded from `listScopes()` used for new-attempt selection, but an already-open attempt against it stays accessible
- [ ] 3.2 GREEN extend `InventoryScope` with `active`/`companyId` in `src/shared/api/inventory/models.ts`; add `createScope`/`updateScope`/`deactivateScope` to `port.ts`; implement in `mock.ts`; backfill `active`/`companyId` on the 3 seeded scopes in `fixtures.ts`
- [ ] 3.3 RED `src/shared/api/inventory/http.adminWarehouses.test.ts`: the three methods throw `HTTP_DISABLED_MESSAGE` on both HTTP adapters
- [ ] 3.4 GREEN add the three `disabled()` stubs to `http.ts`
- [ ] 3.5 RED `src/features/admin/warehouses/AdminWarehousesScreen.test.tsx`: list renders via the `Table` primitive with a labelled scroll region; create/edit/deactivate flow; non-admin sees unauthorized label, zero mutation calls
- [ ] 3.6 GREEN implement `src/features/admin/warehouses/{AdminWarehousesScreen.tsx,useAdminWarehouses.ts}` using `src/shared/ui/primitives/Table.tsx`; wire `admin/warehouses` route; `admin.warehouses.*` i18n keys; `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run fsd` clean; commit `feat(admin): warehouse CRUD screen`

## Phase 4: Baseline Isolation Core (PR 4, highest risk) — spec: admin-inventory-baseline "Versioned baseline snapshot type", "Baseline lives in a structurally isolated module"

- [ ] 4.1 RED `src/shared/api/inventory/baseline-mock.test.ts`: `uploadBaseline` round-trip keeps `expectedQuantity` as exact string (`"12.500"`, no float coercion, no trailing-zero loss); second upload yields `version:2` and leaves v1 byte-identical; `getBaseline` returns latest, `listBaselineVersions` returns all newest-first
- [ ] 4.2 GREEN create `src/shared/api/inventory/baseline-models.ts` (`BaselineRow`, `BaselineVersion` — isolated, mirrors `leader-models.ts` header comment) and `src/shared/api/inventory/baseline-port.ts` (`AdminBaselineApiPort`, deliberately not on `InventoryApiPort`) and `src/shared/api/inventory/baseline-mock.ts` (`mockAdminBaselineApi`, append-only `Map<warehouseId, BaselineVersion[]>`)
- [ ] 4.3 RED add a dependency-cruiser test/config assertion: a deliberate throwaway import of `baseline-models.ts` from an operator-facing path (e.g. a temp file under `src/features/capture/`) fails `npm run fsd`; imports from `src/features/admin/inventory-baseline/`, `src/shared/api/inventory/`, and the baseline module itself pass
- [ ] 4.4 GREEN add `baseline-is-admin-baseline-only` rule to `dependency-cruiser.js`: `from.pathNot: '^(src/features/admin/inventory-baseline/|src/shared/api/inventory/)'`, `to.path: '^src/shared/api/inventory/baseline-(models|port|mock)\\.ts$'`, `severity: 'error'`; remove the throwaway violating file used in 4.3, re-run `npm run fsd` to confirm it now passes clean
- [ ] 4.5 RED typecheck-only test asserting `InventoryApiPort` (`port.ts`) has no baseline member, and that `useInventoryApi()`'s return type cannot call a baseline method (compile-time assertion, not runtime)
- [ ] 4.6 GREEN confirm by construction (no production code change needed if 4.2 kept baseline off `InventoryApiPort`); add `disabledHttpAdminBaselineApi` stub to `http.ts` implementing `AdminBaselineApiPort` with `disabled()` on all three methods
- [ ] 4.7 `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run fsd` clean; commit `feat(inventory): isolated admin baseline port, mock, and dependency-cruiser gate`

## Phase 5: Baseline CSV Upload UI (PR 5) — spec: admin-inventory-baseline "CSV upload with strict per-row validation", "Baseline uploads are versioned, never overwritten"

- [ ] 5.1 RED `src/features/admin/inventory-baseline/parseBaselineCsv.test.ts`: header validation, missing/extra columns, empty file, `>5000` rows rejected with `BASELINE_ROWS_EXCEEDED`, `expectedQuantity` kept as exact string (`dynamicTyping:false`), CRLF/BOM handled, formula-looking cell (`=cmd()`) parsed and later rendered verbatim as text (never evaluated)
- [ ] 5.2 GREEN implement `src/features/admin/inventory-baseline/parseBaselineCsv.ts` using `papaparse` (`header:true`, `dynamicTyping:false`, `MAX_BASELINE_ROWS=5000`); add `papaparse` + `@types/papaparse` to `package.json`
- [ ] 5.3 RED `src/features/admin/inventory-baseline/useBaselineUpload.test.ts`: malformed row (row 4 empty `unit`, row 7 non-decimal `expectedQuantity`) reports both row-numbered errors, upload does not partially commit, no `BaselineVersion` created; valid file creates a version via `mockAdminBaselineApi.uploadBaseline`
- [ ] 5.4 GREEN implement `src/features/admin/inventory-baseline/useBaselineUpload.ts` wiring parse → preview → confirm → `mockAdminBaselineApi.uploadBaseline`
- [ ] 5.5 RED `src/features/admin/inventory-baseline/BaselineUploadScreen.test.tsx`: file select → row/error preview → confirm → version list shows `v{n}`; non-admin sees unauthorized label, zero port calls
- [ ] 5.6 GREEN implement `BaselineUploadScreen.tsx`, wire `admin/baseline` route, `admin.baseline.*` i18n keys (labels, per-row CSV error messages); `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run fsd` clean; commit `feat(admin): baseline CSV upload with per-row validation and versioning`

## Phase 6: Admin Assignment + Operator Filter (PR 6, depends on PR 2 + PR 3) — spec: admin-assignment (all four requirements)

- [ ] 6.1 RISK: before editing, re-read the current `src/features/bodegas/BodegasList.tsx` — `full-product-real` may have modified it since `design.md` was written; reconcile the `listScopes()` → `listAssignedScopes(userId)` swap against its present state, not the design snapshot
- [ ] 6.2 RED `src/shared/api/inventory/mock.assignment.test.ts`: `assignWarehouse`/`unassignWarehouse`/`listAssignments` round-trip; duplicate assignment rejected (`DUPLICATE_ASSIGNMENT`); multiple operators assigned the same warehouse both proceed independently with no conflict check
- [ ] 6.3 GREEN add `AssignmentRecord` to `admin-models.ts`; add `listAssignments`/`assignWarehouse`/`unassignWarehouse`/`listAssignedScopes` to `port.ts`; implement in `mock.ts` with a module-level `Map`, cleared in `resetDemo`
- [ ] 6.4 RED `src/shared/api/inventory/http.assignment.test.ts`: the four methods throw `HTTP_DISABLED_MESSAGE` on both HTTP adapters
- [ ] 6.5 GREEN add the four `disabled()` stubs to `http.ts`
- [ ] 6.6 RED `src/features/admin/assignment/AssignmentScreen.test.tsx` (assign/unassign flow, non-admin unauthorized) + extend `src/features/bodegas/BodegasList.test.tsx`: operator with assignments sees only assigned warehouses; operator with zero assignments sees `app.emptyWarehouses` (never the full list); `demo-admin`/`cost-leader` sessions stay unfiltered
- [ ] 6.7 GREEN implement `src/features/admin/assignment/{AssignmentScreen.tsx,useAssignments.ts}`, wire `admin/assignments` route; apply the reconciled `listScopes()` → `listAssignedScopes(userId)` swap in `BodegasList.tsx` gated to `operator` role only; `admin.assignment.*` i18n keys; `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run fsd` clean; commit `feat(admin): warehouse assignment and operator-filtered BodegasList`
