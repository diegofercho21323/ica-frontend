# Proposal: frontend-access-1c — Mock Access (3 demo roles)

## Intent

Unblock demo/test flows with a deterministic mock login covering all THREE roles (operador, líder, admin). No backend; session persists without password. Replaces LoginPage placeholder with a usable AntD form.

## Scope

### In Scope
- Mock login form (AntD, controlled `useState`, keyboard submit, inline Spanish errors via `t()`)
- Session persistence without password (extend `toPersistedSession` pattern)
- Protected routing: `/dashboard`, `/bodegas`, `/capture` require session; `/login` public
- Logout clearing session
- First Playwright spec: valid Login→Dashboard + invalid login stays with error

### Out of Scope
- Real backend auth, tokens, refresh, password hashing
- Role-based permission enforcement beyond demo visibility
- Password recovery, registration, profile management

## Capabilities

### New Capabilities
- `access`: mock auth — login form, session persistence, protected routing, logout

### Modified Capabilities
- None (LoginPage is a placeholder, no spec-level behavior to modify)

## Approach

Thin page composition per FSD (`src/pages/` wires feature slice; primitives from `shared/ui/`; strings via `t()` with new `es.json` access keys). Deterministic in-memory role map; session shape reuses `toPersistedSession` minus password. Route guard redirects unauthenticated to `/login`. STRICT TDD (`npm run test:run`); single PR ≤800 lines.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/router.tsx` | Modified | Route guard for protected paths |
| `src/pages/*Login*` / screens | Modified | Real form replaces placeholder |
| `src/**/persistence.ts` | Modified | Session persist/load without password |
| `src/app/i18n/es.json` | Modified | New `access.*` strings |
| `e2e/` | New | First login spec |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mock shape diverges from future real auth | Med | Isolate behind session adapter; note in spec |
| AntD vs `shared/ui` primitives drift | Low | Wrap AntD in page slice only |

## Rollback Plan

Revert single PR; placeholder LoginPage and public routes restored. No migration — session key namespaced, safe to drop.

## Dependencies

- None (internal deterministic mocks; research lane NONE)

## Success Criteria

- [ ] All 3 roles log in via keyboard-only flow with Spanish inline errors
- [ ] Reload preserves session; logout clears and redirects to `/login`
- [ ] Anonymous access to protected routes redirects to `/login`
- [ ] Playwright spec green; `npm run test:run` green
