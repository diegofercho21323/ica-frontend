# Access Specification

## Purpose

Mock authentication for demo/test: login form, passwordless persisted session, protected routing, logout, and first Playwright coverage. No real backend.

Out of scope: real auth/tokens/refresh/hashing, role permission enforcement, recovery/registration, PWA, MFA.

## Requirements

### Requirement: Mock login form with three roles

The system MUST accept deterministic mock credentials for `operador`, `lider`, and `admin`, support keyboard-only submit, and show inline Spanish errors via `t()`.

#### Scenario: Valid login per role

- GIVEN the user is on `/login`
- WHEN submitting valid mock credentials for each role via keyboard (Tab + Enter)
- THEN the session starts with that role and redirects to `/dashboard`

#### Scenario: Invalid credentials stay with error

- GIVEN the user is on `/login`
- WHEN submitting unknown user or wrong password
- THEN the user stays on `/login` AND an inline Spanish error appears near the form

#### Scenario: Empty fields blocked inline

- GIVEN the user is on `/login`
- WHEN submitting with empty username or password
- THEN inline Spanish required-field errors appear AND no session starts

### Requirement: Passwordless persisted session

The system MUST persist the session across reload without ever persisting the password, reusing the `toPersistedSession` shape minus password.

#### Scenario: Reload preserves session

- GIVEN an authenticated session
- WHEN the page reloads
- THEN the session (user + role, no password) restores without re-login

#### Scenario: Password never persisted

- GIVEN a successful login
- WHEN inspecting persisted storage
- THEN no password value is present in any key

### Requirement: Protected routing and logout

The system MUST require a session for `/dashboard`, `/bodegas`, `/capture`, redirect unauthenticated visits to `/login`, keep `/login` public, and return to `/login` on logout with session cleared.

#### Scenario: Anonymous redirected

- GIVEN no session
- WHEN visiting `/dashboard`, `/bodegas`, or `/capture`
- THEN the system redirects to `/login`

#### Scenario: Logout clears and returns

- GIVEN an authenticated session
- WHEN logging out
- THEN the session is cleared AND the user lands on `/login`

### Requirement: Playwright login coverage

The system MUST have a Playwright spec proving Login→Dashboard happy path and invalid-login-stays-with-accessible-error.

#### Scenario: Happy path e2e

- GIVEN the app at `/login`
- WHEN logging in with a valid mock role
- THEN `/dashboard` renders for that role

#### Scenario: Invalid login e2e

- GIVEN the app at `/login`
- WHEN submitting invalid credentials
- THEN the URL stays on `/login` AND an accessible error is visible
