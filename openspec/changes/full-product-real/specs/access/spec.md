# Delta for access

Phase: F2 (skeleton; token flow lands on backend-auth gate).

## MODIFIED Requirements

### Requirement: Mock login form with three roles

The system MUST authenticate via `POST auth/token` (form `email` + `password` → `{access_token, token_type}`), validate the session via `GET auth/me`, store only the token + expiry (never the password), and show inline Spanish errors via `t()`. Mock credentials remain valid ONLY when `VITE_INVENTORY_ADAPTER=mock`.
(Previously: deterministic mock-only credentials with no token.)

#### Scenario: Valid token login per role

- GIVEN the user is on `/login`
- WHEN submitting valid credentials via keyboard (Tab + Enter)
- THEN token + expiry persist, `/me` resolves the role, and the app redirects to `/dashboard`

#### Scenario: Invalid credentials stay with error

- GIVEN the user is on `/login`
- WHEN submitting unknown user or wrong password
- THEN the user stays on `/login` AND an inline Spanish error appears near the form

#### Scenario: Password and token hygiene

- GIVEN a successful login
- WHEN inspecting persisted storage
- THEN no password value is present AND expiry/clear on logout is enforced

## ADDED Requirements

### Requirement: RequireRole mirrors server

Frontend `RequireRole` MUST gate leader routes (recount) and operator actions (submit) by role, MUST treat gates as UX mirrors only (server enforces; `403` on recount for non-leaders), and MUST surface `403`/`401` via `t()` with a re-login path.

#### Scenario: Non-leader blocked with message

- GIVEN an operator session
- WHEN opening the leader-only recount route
- THEN a `t()` unauthorized message shows AND no recount mutation fires

#### Scenario: Expired session re-logins

- GIVEN an expired token on a protected route
- WHEN any query returns `401`
- THEN the session clears and the user lands on `/login` with a `t()` message
