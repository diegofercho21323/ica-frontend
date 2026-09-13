# Exploration: Admin Console (users CRUD, warehouses CRUD, inventory baseline upload, per-warehouse assignment)

> Status: `done` | Change: `admin-console` | Revision: `1`

## Current State

**Roles.** `DemoRole = 'operator' | 'cost-leader' | 'demo-admin'` (`src/shared/api/inventory/models.ts:1`). All three are recognized end-to-end: `parseDemoSession` validates them (`src/features/access/parseDemoSession.ts:3-6`), the HTTP adapter's `toDemoSession` accepts the same three from `GET auth/me` (`src/shared/api/inventory/http.ts:137,144`), and the mock demo credentials include an `admin`/`admin` → `demo-admin` account (`src/shared/api/inventory/fixtures.ts:30-36`). **However, `demo-admin` is currently inert** — no route, screen, feature, or port method exists that is gated to or built for that role. It authenticates and lands wherever `demo-admin` sessions route today (dashboard), with zero admin-specific capability. This confirms the premise: the role exists structurally but the surface does not.

**Role gating primitive.** `RequireRole` (`src/features/access/RequireRole.tsx:11-26`) is built, tested (`RequireRole.test.tsx`), and documented as a "UX mirror only" — the server is the real enforcement point (comment at line 6-9: `createRecount` rejects non-leaders with 403, so this component only keeps the workspace out of sight). **It is not currently wired into any router or page.** `src/app/router.tsx:1-32` only uses `RequireAuth` (session-required gate); there is no role-scoped route anywhere. `RecountScreen.tsx` implements its own local `canRecount: boolean` prop pattern instead of composing `RequireRole` directly, and is itself not yet mounted in the router (F4-PR2 tasks 5.3/5.4 in `openspec/changes/full-product-real/tasks.md` are being applied concurrently with this exploration). **This means the admin console would be the first surface to actually route-gate on a role in production code** — a genuinely new integration, not a copy of an existing wired pattern.

**Warehouse = `InventoryScope`.** Today's minimal shape is `{ id: string; name: string }` (`src/shared/api/inventory/models.ts:26-29`), with exactly 3 fixtures (`scope-centro`, `scope-norte`, `scope-sur`, `src/shared/api/inventory/fixtures.ts:9-13`). A parallel richer shape, `TenantScope`, already exists as a mapping layer: `{ snapshot_id, warehouse_id, scope_key, display_name, companyId }` (`src/features/tenants/tenant-catalog.ts:9-15`), built via `toTenantScope()` as an explicit passthrough from `InventoryScope` + a caller-supplied `companyId` (comment at lines 6-8: "the mock InventoryScope only carries id+name, so the mapping below is an explicit passthrough labeled mock-backed — the client invents no server fields"). No CRUD (create/edit/deactivate) exists on either shape — `listScopes()` is the only port method touching warehouses (`InventoryApiPort`, `src/shared/api/inventory/port.ts:19`).

**Port pattern for CRUD-to-be.** `InventoryApiPort` (`src/shared/api/inventory/port.ts:17-31`) is the single typed interface both `mockInventoryApi` (`src/shared/api/inventory/mock.ts`) and the progressive `createHttpInventoryApi`/`disabledHttpInventoryApi` (`src/shared/api/inventory/http.ts:186-307`) implement. The HTTP adapter is real but selectively enabled per-method: most methods currently throw `HTTP_DISABLED_MESSAGE` (`http.ts:22-23,246-248,262-263,277-281`) until a published backend contract exists — only `loginDemo`, `saveBatch`, and `submit` are wired. **This is the exact extension point**: any new admin capability should add methods to `InventoryApiPort`, implement them fully in `mockInventoryApi`, and add them to `createHttpInventoryApi`/`disabledHttpInventoryApi` as `disabled()` stubs, matching the established swap-without-rewriting-features contract (PRD §15, "API no publicada: estrategia de integración").

**Blind-safety enforcement is structural, not just conventional.** `dependency-cruiser.js:37-43` defines `leader-view-is-recount-authoring-only`: only `src/features/recount-authoring/` (note: the actual recount feature folder is `src/features/recount/` — this rule path does not match the real folder, a pre-existing discrepancy, not something to fix here) and `src/shared/api/inventory/` may `import type` from `leader-models.ts`. Anything else fails `npm run fsd` at build/CI time. This is a **precedent for structurally isolating privileged-only types** via dependency-cruiser, exactly the mechanism needed to guarantee an inventory baseline/snapshot type can never be imported by operator-facing capture code — not merely "reviewed for," but compiler/lint-enforced.

**`OperatorLineView`** (`src/shared/api/inventory/models.ts:14-20`): `{ code, name, unit, state, currentQuantity }`. This is the operator-visible shape. Any baseline/snapshot record would need to carry at minimum `code`/`name`/`unit` (for reconciliation identity) plus a theoretical/expected quantity field — which per PRD §4 ("No se permite en ICA: stock teórico...") and the whole blind-count premise, **must never reach `OperatorLineView` or any operator-rendered component**.

**File upload / CSV / Excel.** No client-side parsing library exists in `package.json` — no `papaparse`, `xlsx`, `sheetjs`, or similar. No `<input type="file">` usage anywhere in `src/shared/ui/primitives/` or `src/features/`. This is fully new territory requiring either a new dependency or server-side parsing (not applicable here — frontend-only repo, mock-first).

**UI primitives inventory** (`src/shared/ui/primitives/`): `HomeShell, Button, NumericInput, Status, SearchInput, Modal, Drawer, Table, Progress, UnitBadge, ScannerTrigger, ItemCard, LiveRegion, KpiCard`. **There is no dedicated `Card`, `Checkbox`, or `Input` primitive** — existing screens (`BodegasList.tsx`, `RecountScreen.tsx`) import `Card`, `Checkbox`, `Input`, `Alert`, `Typography`, `Radio`, `List` directly from `antd`. This corrects an assumption in the brief: those are AntD components used as-is, not existing shared primitives to reuse verbatim — though the pattern ("use AntD directly for simple form/display controls, reserve `shared/ui/primitives` for themed/business-aware wrappers like `Table`, `Modal`") is itself reusable. **`Table` primitive already exists** (`src/shared/ui/primitives/Table.tsx`, a themed AntD `Table` wrapper with a labelled scroll region) and is directly suited to a warehouse/user CRUD list. **No file-upload primitive exists** — net-new.

**PRD scope check.** `docs/PRD.md` was searched for "admin", "CRUD", "Excel", "CSV", "asignar", "snapshot", "carga", "upload". Zero matches for any admin/CRUD/upload/baseline concept. §22 ("No objetivos del MVP") explicitly lists as **out of scope**: "Planificador backend completo de turnos, bodegas o asignaciones" (a full scheduling/warehouse/assignment planner), and "stock teórico" (theoretical stock) is explicitly forbidden from being shown anywhere in ICA (§4). **This means the admin console as described is a new capability area not covered by the current PRD**, and directly touches a phrase ("stock teórico") the PRD calls out as forbidden-to-display — which is fully compatible IF the baseline stays leader/admin-only and structurally unreachable from operator code (see blind-safety finding above), but is a meaningful scope/PRD-alignment gap to flag explicitly before proposing.

**Assignment semantics today.** The only existing "assignment" concept is `RecountInput.assignee: string` (`src/shared/api/inventory/models.ts:83-86`) — a free-text string, not a catalog reference (PRD §23: "el backend acepta hoy un string" for `assignee`, and lists "Definir catálogo/autorización de operadores para `assignee`" as an open decision). `startAttempt(scopeId, mode)` (`port.ts:20`) takes no operator/assignee argument — any operator can start any scope today; `BodegasList.tsx` shows **all** scopes to whoever is logged in (`mockInventoryApi.listScopes()`, no per-user filter). There is no existing concept of "this warehouse is assigned to this operator, so only show them their assigned warehouses."

## Affected Areas

- `src/shared/api/inventory/models.ts` — needs new types: warehouse CRUD payload, user record, baseline/snapshot record, assignment record.
- `src/shared/api/inventory/port.ts` — needs new `InventoryApiPort` (or a new admin-scoped port) methods for user/warehouse CRUD, baseline upload, assignment.
- `src/shared/api/inventory/mock.ts` / `fixtures.ts` — mock implementation + fixtures for the above.
- `src/shared/api/inventory/http.ts` — new methods added as `disabled()` stubs (matches existing pattern), never live HTTP.
- `src/features/access/RequireRole.tsx`, `src/app/router.tsx` — first real route-level role gate; currently unwired anywhere.
- `dependency-cruiser.js` — likely needs a new isolation rule mirroring `leader-view-is-recount-authoring-only` to structurally forbid operator-facing code from importing the baseline/snapshot type.
- `src/shared/ui/primitives/` — reuse `Table` for list views; net-new file-upload primitive needed.
- `src/features/bodegas/BodegasList.tsx` — if assignment gates which warehouses an operator sees, this is the read path that must change (currently unfiltered).
- `openspec/changes/full-product-real/` — an active, unarchived, related change already touches `access`, `bodegas-list`, `tenant-context`; admin-console should be scoped as an independent change to avoid collision, but must respect the `tenant-context` company→scope model already specified (`openspec/changes/full-product-real/specs/tenant-context/spec.md`).
- `docs/PRD.md` — no current admin/CRUD/upload section exists; a PRD amendment or explicit "supersedes/extends PRD §22" note will likely be needed at proposal time.

## Approaches

### For inventory baseline upload (CSV/Excel)

1. **Client-side parse with a new dependency (`papaparse` for CSV; `xlsx`/`exceljs` for `.xlsx`)** — parse the `File` in-browser, validate rows against a typed schema, then call a new `uploadBaseline(warehouseId, rows)` port method that the mock stores in-memory (mirroring how `mock.ts` stores everything else) and the HTTP adapter stubs as `disabled()`.
   - Pros: Matches the existing mock-first, no-backend-yet architecture exactly; no server dependency; fastest to demo.
   - Cons: New dependency to vet (bundle size, license); client trusts its own parsing/validation until a real backend takes over; large files parsed in the main thread could jank the UI without care.
   - Effort: Medium.

2. **Defer parsing to a future HTTP adapter (upload raw file via `multipart/form-data`, server parses)** — client only handles `File` selection/preview, no parsing library needed yet; the `disabled()` HTTP stub simply isn't implementable client-side until then.
   - Pros: Zero new dependency now; avoids client-side parsing correctness/precision risk (the same "exact decimal string" concerns that already drive quantity handling elsewhere in this app).
   - Cons: The mock adapter can't meaningfully demo a "snapshot" from a real file without *some* client-side parsing (even the mock needs to turn file bytes into rows) — this only defers the decision, it doesn't avoid it for the mock path.
   - Effort: Low (short-term), but pushes the real problem downstream.

**Given this is a frontend-only, mock-first repo where the demo must work without a backend, Approach 1 (client-side parse) is the only one that can actually produce a working mock-backed demo.** The exact library choice (`papaparse` vs `xlsx`) is a decision for `sdd-propose`/`sdd-design`, not this exploration — but the CSV-only path (`papaparse`, ~40KB) is materially lighter than full Excel support (`xlsx`, much larger) and should be evaluated against actual product need (does the admin persona need `.xlsx` specifically, or is CSV export from their ERP/spreadsheet tool sufficient for MVP?).

### For "assign inventory per warehouse to each user"

1. **Pre-assignment record (admin creates `{userId, warehouseId}` links; operator's `BodegasList` query filters by assignment)** — smallest correct interpretation matching the brief exactly ("operator can already choose guided/manual" implies mode choice stays; only *which warehouses appear* changes).
   - Pros: Minimal new concept (one join-like record type + one filtered query); reuses `startAttempt(scopeId, mode)` unchanged — operators still pick mode themselves; directly composable with the existing `demo-admin` role and `TenantScope`/company model without redesigning it.
   - Cons: Needs a decision on fallback behavior (what does an operator with zero assignments see — empty state, or all warehouses as today?); needs a decision on whether cost-leaders are also assignable or admin-only assigns operators.
   - Effort: Low–Medium.

2. **Full scheduling/roster system (shifts, capacity, multi-operator per warehouse, time windows)** — explicitly the PRD §22 non-goal ("Planificador backend completo de turnos, bodegas o asignaciones").
   - Pros: None relevant to the stated ask.
   - Cons: Directly contradicts an explicit non-goal; massive scope inflation.
   - Effort: High — and out of bounds per PRD.

**Approach 1 is recommended** and is the only one consistent with both the user's literal request and the PRD's explicit non-goals.

## Recommendation

Scope `admin-console` as three additive, independently reviewable capabilities layered on the existing `InventoryApiPort`/mock pattern:

1. **`admin-users`**: CRUD on a new `AdminUser` type (`id, displayName, role, active`), gated by `demo-admin` via `RequireRole` at the route level (the first real wiring of that gate) — mock-only, HTTP stubs disabled.
2. **`admin-warehouses`**: CRUD on `InventoryScope`/`TenantScope` (extend, don't replace — add `active`, `companyId` as first-class fields since `TenantScope` already carries `companyId`), reusing the `Table` primitive.
3. **`admin-inventory-baseline`**: a new, dependency-cruiser-isolated module (mirroring `leader-models.ts`'s isolation pattern) holding a versioned baseline/snapshot record per warehouse, populated via manual entry, a future API integration stub, or CSV upload (`papaparse`), structurally unimportable from any operator-facing path.
4. **`admin-assignment`**: `{userId, warehouseId}` records that filter `BodegasList`'s query for non-admin roles.

This keeps each slice small (matches the project's 400-line PR budget convention already used in `full-product-real/tasks.md`), keeps the mock-first/HTTP-disabled-stub contract intact, and gives `sdd-propose` four clean capability boundaries instead of one monolithic admin blob.

## Risks

1. **PRD misalignment**: no PRD section covers admin/CRUD/upload/assignment; §22 lists warehouse/assignment planning as an explicit non-goal, and §4 forbids showing "stock teórico" anywhere in ICA. The baseline concept is compatible only if leader/admin-only isolation is structurally enforced (dependency-cruiser), not just documented — this must be an explicit, testable requirement in the eventual spec, not an assumption.
2. **`RequireRole` is untested in real routing**: it has unit tests but zero integration wiring in `router.tsx` today. The admin console will be the first consumer to prove the pattern actually gates a live route, which may surface gaps.
3. **`assignee`/user catalog is presently just a string** (PRD §23 open decision) — building `admin-users` CRUD effectively resolves that PRD open decision as a side effect; this should be called out explicitly in the proposal as closing a named PRD gap, not silently.
4. **CSV/Excel dependency choice is unresourced**: no vetting of `papaparse`/`xlsx` bundle size, license, or maintenance status has been done; this is a `sdd-design`-level decision, flagged here only as a known constraint.
5. **Dependency-cruiser rule `leader-view-is-recount-authoring-only` already references a non-existent path** (`src/features/recount-authoring/` vs. the real `src/features/recount/`) — a pre-existing latent gap unrelated to this change, but relevant precedent: a new baseline-isolation rule for admin-console must be written against the *actual* folder it creates.
6. **`full-product-real` is mid-flight** (F4/F5 in progress) and touches `access`, `bodegas-list`, `tenant-context` — admin-console should treat those specs as read-only dependencies, not modify them, to avoid merge collisions with an in-progress unrelated change.

## Next step

Ready for proposal. Run `sdd-propose` for `admin-console`, splitting into the four capability slices identified above (`admin-users`, `admin-warehouses`, `admin-inventory-baseline`, `admin-assignment`) rather than one monolithic admin change. The proposal should explicitly note it extends PRD §22's non-goal boundary (only simple pre-assignment, never full scheduling) and closes the PRD §23 open decision on the `assignee` catalog.

---
<!-- gentle-ai:sdd-explore/v1 revision=1 outcome=done -->
