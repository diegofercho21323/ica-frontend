# Proposal: Full Real Product — Multi-Company Blind Count

## Intent

Evolve the mock-first MVP into a real multi-tenant product: any company calibrates, counts blind, submits idempotently, recounts — backend-backed.

## Scope

### In Scope
- Swappable adapter (mock default, HTTP progressive) + App. A parity, tenancy, `session_id`
- Guided + manual capture, keyboard-first, 12 primitives, responsive shell
- Close-loop UI: submit/recount/history, queue without 409 auto-resolve
- Offline PWA outbox + telemetry + blind-safety, AA, full i18n

### Out of Scope
- Real Oracle, deploy, variance/ranking/demand (§§4, 22)
- Multi-user reconciliation, 409 auto-resolve, voice/OCR beyond demo

## Capabilities

### New Capabilities
- `tenant-context`: company→scopes→snapshots, `session_id`
- `http-inventory-adapter`: App. A DTOs, errors, idempotency
- `guided-capture`: one-line assistant, manual, shortcuts
- `submission-queue`: receipts, retry/replay, conflicts
- `offline-outbox`: idb-keyval queue + PWA shell
- `product-telemetry`: timing, unit-error, retries

### Modified Capabilities
- `access`: demo → token flow; `RequireRole` mirrors server
- `app-shell`: adapter selection, session, locales
- `bodegas-list`: per-company scopes/catalog
- `capture`: exact-string quantities, advisory confirm
- `visual-shell`: AntD 5 tokens (Tallycore brand values confirmed)

## Approach

Phased; each phase owns spec/design/tasks, PRs ≤400 lines.

| Phase | Ships | Gate | PRs |
|-------|-------|------|-----|
| F1 Reconcile | PR2 code↔tasks; config adapter | None | 2 |
| F2 Contract | HTTP adapter, auth, tenancy | URL/CORS/auth/`session_id` | 3–4 |
| F3 Capture | Primitives, tokens, guided/manual, AA, i18n | Tokens confirmed | 4–5 |
| F4 Close-loop | Submit/recount/history | Roles + reads | 3 |
| F5 Offline | PWA, outbox, telemetry, blind tests | Storage policy | 2–3 |

FSD strict; Query owns server state; mock stays as harness.

## Affected Areas

| Area | Impact | Change |
|------|--------|--------|
| `shared/api/inventory/` | Modified | Port/models; enable `http.ts` |
| `src/app/` | Modified | Adapter, session, router, i18n |
| `src/features/` | Modified/New | Tenant, capture, submission, recount |
| `shared/ui/primitives/` | Modified | 12 primitives, tokens, shell |
| `src/shared/lib/` | New | Idempotency, queue, telemetry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend unpublished | High | Mock default; HTTP flagged |
| UI roles ≠ security | Med | Server-enforced |
| Blind/decimal regression | Med | Failing tests; strings only |
| Brand token re-skin later | Low | Values resolved via ConfigProvider only; swappable at token layer |

## Rollback Plan

Flag-off to mock per phase; each PR revertible (≤400 lines); F3–F5 gated.

## Dependencies

Backend URL/CORS/env, auth, `session_id` + reads, roles. Brand tokens confirmed (Ducore / Tallycore).

## Success Criteria

- [ ] Adapter via config; no direct mock/Axios in features
- [ ] Keyboard-only capture; AA; `es` complete via `t()`
- [ ] Queue synced/pending/conflict; 409 never auto-resolves
- [ ] Blind-safe; exact-string quantities end to end
