# Design: Mock Access (3 demo roles)

## Technical Approach

Feature slice `features/access` owns session domain (context, guard, form, validation); `app/providers.tsx` only mounts `SessionProvider`, `src/pages/screens.tsx` wires `LoginPage` to the slice. Router stays declarative via `RequireAuth` wrapper. Persistence extends the existing `toPersistedSession` shape (already passwordless) under a new idb-keyval key. STRICT TDD with `npm run test:run`; e2e `e2e/login.spec.ts` last.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| SessionProvider in `app/providers` vs `features/access` | App-level is global but mixes domain into shell | Define context in `features/access`, mount in `app/providers` (FSD: shared state via context, domain stays in feature) |
| `RequireAuth` wrapper vs action-route login | Actions add loader complexity for a mock with no backend | `RequireAuth` wrapper with `<Navigate to="/login" state={{from}}>`; `/login` public, redirects to `from ?? /dashboard` when session exists |
| Session validation | idb-keyval payload may be stale/junk after iterations | `parseDemoSession(unknown)` validates `userId`/`displayName` + role union (`operator\|cost-leader\|demo-admin`); returns `null` on any mismatch, guard treats as anonymous |
| Session key | Reuse `last-route` store vs new key | New key `demo-session` in existing `ica-demo` store; value = `toPersistedSession()` output (no password field exists on `DemoSession`) |
| Login form state | AntD Form (uncontrolled internally) vs raw `useState` | AntD `<Form onFinish>` with field state mirrored in `useState`; native submit gives Tab+Enter free; errors inline via `t('access.*')` below inputs (`role="alert"`) |

## Data Flow

```
LoginForm ──loginDemo()──→ mockInventoryApi ──DemoSession──→ SessionProvider ──set──→ idb-keyval[demo-session]
   │ (invalid: inline error, stays)        │ (valid: Navigate /dashboard or `from`)
RequireAuth ──parseDemoSession(load)──→ session? outlet : /login ──→ logout: clear key + Navigate /login
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/access/SessionContext.tsx` | Create | Context, `useSession`, login/logout against `loginDemo` + persistence |
| `src/features/access/parseDemoSession.ts` | Create | Runtime validator for persisted payload |
| `src/features/access/RequireAuth.tsx` | Create | Guard wrapper for protected routes |
| `src/features/access/LoginForm.tsx` | Create | AntD form, keyboard submit, inline `t()` errors |
| `src/features/access/*.test.ts(x)` | Create | Unit tests beside each module (TDD) |
| `src/app/providers.tsx` | Modify | Mount `SessionProvider` only |
| `src/app/router.tsx` | Modify | Wrap `dashboard`/`bodegas`/`capture` in `RequireAuth`; `/login` public |
| `src/pages/screens.tsx` | Modify | `LoginPage` renders `LoginForm` slice |
| `src/app/i18n/es.json` | Modify | Add `access.*` keys (title, labels, required, invalid) |
| `e2e/login.spec.ts` | Create | Login→Dashboard happy path + invalid-stays-with-error |

## Interfaces / Contracts

```ts
// persisted value: DemoSession only — password never leaves the form
parseDemoSession(v: unknown): DemoSession | null
login(c: DemoCredentials): Promise<void> // throws → form shows t('access.invalid')
logout(): Promise<void> // clears demo-session, routes /login
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `parseDemoSession` valid/junk, `toPersistedSession` strips password | Vitest, TDD first |
| Integration | Provider login/logout, guard redirects, form empty/invalid/valid | Vitest + Testing Library |
| E2E | Login→Dashboard + invalid stays with accessible error | `e2e/login.spec.ts` (Playwright, chromium) |

## Threat Matrix

N/A — no routing/shell/subprocess/VCS-PR/executable-classification/process-integration boundary beyond in-app `react-router` redirects.

## Migration / Rollout

No migration. Rollback = revert single PR: placeholder `LoginPage` and public routes restored; `demo-session` key namespaced in `ica-demo` store, safe to drop via `demoPersistence.reset()`. PR 1a/main untouched semantics; single PR ≤800 lines.

## TDD Order

1. `parseDemoSession` 2. session-key persistence 3. `SessionContext` 4. `RequireAuth` 5. `LoginForm` 6. router/screens/es.json wiring 7. `e2e/login.spec.ts`.

## Open Questions

- None blocking; role labels operador/líder/admin map to fixture usernames (`operador`/`lider`/`admin`).
