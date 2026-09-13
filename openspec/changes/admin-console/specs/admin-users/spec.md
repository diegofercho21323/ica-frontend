# Admin Users Specification

## Purpose

New capability. Depends on (read-only): `src/shared/api/inventory/port.ts` (`InventoryApiPort` extension point), `src/shared/api/inventory/http.ts` (`disabled()` stub pattern), and `src/features/access/RequireRole.tsx` (existing but unwired role gate). Gives `demo-admin` its first real surface: CRUD on a new `AdminUser` type, route-gated by role.

## Requirements

### Requirement: AdminUser type and port methods

The system MUST define `AdminUser: { id: string; displayName: string; role: DemoRole; active: boolean }` and MUST add `listUsers()`, `createUser()`, `updateUser()`, `deactivateUser()` to `InventoryApiPort`. `mockInventoryApi` MUST implement all four fully, in-memory. `createHttpInventoryApi`/`disabledHttpInventoryApi` MUST add the same four as `disabled()` stubs, matching the existing pattern for unpublished endpoints.

#### Scenario: Mock CRUD round-trip

- GIVEN the mock adapter is active
- WHEN an admin creates a user, lists users, updates the role, then deactivates the user
- THEN each call resolves and `listUsers()` reflects the current state without a page reload

#### Scenario: HTTP adapter stays disabled

- GIVEN `VITE_INVENTORY_ADAPTER` selects the HTTP adapter
- WHEN any of the four user methods is called
- THEN it throws `HTTP_DISABLED_MESSAGE` and performs no network request

### Requirement: Admin route gated to demo-admin

The system MUST wire `RequireRole` into `src/app/router.tsx` for the admin-users route, allowing only `demo-admin`. This is the first production wiring of `RequireRole` into the router.

#### Scenario: Admin reaches the route

- GIVEN a `demo-admin` session
- WHEN navigating to the admin-users route
- THEN the user CRUD screen renders

#### Scenario: Non-admin sees the 403 mirror and triggers zero mutations

- GIVEN an `operator` or `cost-leader` session
- WHEN navigating to the admin-users route
- THEN the existing `RequireRole` unauthorized message renders in place of the screen
- AND no `createUser`, `updateUser`, or `deactivateUser` call fires

### Requirement: Deactivation preserves audit trail

Deactivating an `AdminUser` MUST set `active: false` and MUST NOT delete or mutate any historical attempt or submission record tied to that user's `userId`.

#### Scenario: Deactivated user's history remains queryable

- GIVEN a user with prior attempts has been deactivated
- WHEN their attempt history is queried
- THEN all prior attempts and submissions are still present and unchanged
