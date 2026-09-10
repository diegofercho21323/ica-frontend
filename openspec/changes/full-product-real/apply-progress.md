# Apply Progress — full-product-real

Mode: **Strict TDD** (runner `npm run test:run`)
Store: openspec (file-based). Engram not used (MCP misconfigured for this session).
Branch: `feat/cierre-mock` — sequential commits, no worktree.

## Work Unit: F1-PR3 (tasks 1.3 + 1.4) — repo-wide green after attempt-scoped `saveBatch`

Status: **implementation complete, all evidence green**. Attempt-ledger settle blocked on maintainer decision (see below).

### Completed tasks

| Task | State | Commit |
|------|-------|--------|
| 1.3 REFACTOR: migrate remaining 2-arg `saveBatch` callers | [x] | `cfda340` refactor(inventory): attempt-scoped saveBatch callers |
| 1.4 Restore the 12 red tests → repo-wide green | [x] | `0d21336` test: repo-wide green after attempt-scoped saveBatch |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.3 | `src/features/attempts/ReviewScreen.test.tsx` | Integration (RTL) | ✅ baseline 2/4 fail (TS2554 + runtime) | ✅ pre-existing RED | ✅ 4/4 pass | ➖ callers already covered by `mock.saveBatch.test.ts` | ➖ none needed |
| 1.4a | `tests/inventory.contract.test.ts` | Unit (contract) | ✅ baseline 4/13 fail | ✅ RED (fake `'attempt-1'`) | ✅ 13/13 pass | ✅ 4 distinct read assertions (states / decimals / isolation) | ➖ |
| 1.4b | `tests/blind-safety.contract.test.ts` | Unit (contract) | ✅ baseline 1/2 fail | ✅ RED | ✅ 2/2 pass | ➖ single projection under test (companion `listScopes()` case stays green) | ➖ |
| 1.4c | `src/features/dashboard/DashboardKpis.test.tsx` | Integration (RTL) | ✅ baseline 2/4 fail | ✅ RED (finds "0" not "5") | ✅ 4/4 pass | ✅ value case (5/3/2/60) + responsive grid case | ✅ removed dead `useQuery`, doc comment added |
| 1.4d | `src/features/capture/CaptureTable.attempt.test.tsx` | Integration (RTL) | ✅ baseline 1/2 fail | ✅ RED (stale reveal-on-counted) | ✅ 2/2 pass | ➖ mirrors `CaptureTable.test.tsx` F6-P1 blindness case | ➖ |
| 1.4e | `tests/app.smoke.test.tsx` | Integration (RTL router) | ✅ baseline 2/10 fail | ✅ RED (dashboard "5" + legacy `/capture` SKU-001) | ✅ 10/10 pass | ✅ dashboard KPI path + Captura→/bodegas redirect path | ➖ |
| 1.4f | `src/app/inventory.test.ts` | Unit (import audit) | ✅ baseline green | ✅ RED once `DashboardKpis` left mock import | ✅ 12/12 pass (allowlist shrank by 1) | ➖ | ➖ |

Approval tests (refactoring): the contract/blind reads act as approval tests — they capture unchanged mock read behavior, now addressed via a real minted attempt id.
Pure functions created: 0 (reused `selectKpis`).

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `npm run test:run` → **246/246 pass, 42 files** (was 234/246, 12 fail / 6 files) |
| Typecheck | `npm run typecheck` → clean (was 2× TS2554 in `ReviewScreen.test.tsx`) |
| Lint | `npm run lint` → clean, exit 0 |
| FSD | `npm run fsd` → no violations (111 modules, 408 deps) |
| Runtime harness | N/A — mock-only harness, no network/runtime boundary; full suite is the integration surface |
| Rollback boundary | Revert commits `cfda340` + `0d21336`. Touches only test files + `DashboardKpis.tsx` + `screens.tsx` `CapturePage` + one line of `inventory.test.ts` allowlist. `port.ts` and `mock.ts` untouched. |

### Files changed

| File | Action | What |
|------|--------|------|
| `src/features/attempts/ReviewScreen.test.tsx` | Modified | 2 calls `saveBatch(key, changes)` → `saveBatch(attempt.id, key, changes)` |
| `tests/inventory.contract.test.ts` | Modified | `beforeEach` starts a real attempt; 5× `getOperatorLines('attempt-1')` → `getOperatorLines(attemptId)` |
| `tests/blind-safety.contract.test.ts` | Modified | `beforeEach` starts a real attempt; operator read uses minted id |
| `src/features/dashboard/DashboardKpis.tsx` | Modified | derive demo KPIs from `operatorV2Fixture` (attempt-less mock read dropped); removed `useQuery`/loading branch |
| `src/app/inventory.test.ts` | Modified | removed `DashboardKpis.tsx` from migrated-import allowlist (list shrinks per phase) |
| `src/features/capture/CaptureTable.attempt.test.tsx` | Modified | stale "reveal 10.10 on COUNTED" → F6-P1 blindness assertion (5× "Oculta", no system figure) |
| `src/pages/screens.tsx` | Modified | `CapturePage` → `<Navigate to="/bodegas" replace />` (legacy attempt-less `/capture` dropped) |
| `tests/app.smoke.test.tsx` | Modified | Captura-link test reworked: Space activates link → redirect to `/bodegas` scope selection |
| `openspec/changes/full-product-real/design.md` | Modified | open question "legacy `/capture`" marked RESOLVED |
| `openspec/changes/full-product-real/tasks.md` | Modified | 1.3 + 1.4 marked `[x]` with evidence notes |

### Deviations from design

- Design "File Changes" table did not anticipate `DashboardKpis.tsx` needing a data-source change or the `/capture` route redirect. Both follow directly from design decision "delete global overlay" + open question resolution "require attempt, drop legacy path". No semantic deviation.
- `useCaptureForm` keeps its now-unreachable `attemptId ?? 'legacy'` branch (dead code). Left in place to keep the diff minimal and avoid rippling a required-prop change into `AttemptCapturePage`; a later capture phase (F3-PR4) owns that cleanup.

### Blocker — attempt ledger settle needs a maintainer reset

`gentle-ai sdd-attempt settle --outcome passed` returned `blocked / maintainer_decision`.
Cause: the active attempt (`ordinal 11`, work_unit `F6-P2-dashboard-guided`, objective `sha256:daae8094…`, generation 11) was opened against `initial_candidate_tree 49a58db2…`, but the branch advanced well past that before this apply began. The ledger charges the intervening base drift to the attempt → `cumulative_changed_lines: 4608` vs `max_changed_lines: 400` → `decision_required: true`, `next_action: reset`.
This is not clearable by the executor and is unrelated to receipt-driven review. A maintainer must run:

```
gentle-ai sdd-attempt reset --cwd /mnt/developments/ica-frontend --change full-product-real \
  --expected-revision sha256:1a380f6182cc04f4ac30d2904b3848c50a6d35501603116c6940181184599190 \
  --request-id "<unique>" --reason "F1-PR3 apply landed green; prior attempt opened against a stale base tree, base drift mischarged" --actor "<actor>"
```

Retained attempt token: `sha256:0fad172829f212f96c9f5875a57cb7681c1b7fa5aaaa0d244c2115fe9e3f4a62`
Evidence revision (sha256 of git HEAD `0d21336…`): `sha256:876f9ae0b9c9673dda3276d4bcb94a6a159a38e7c8623d505c9ee40204ae644c`

### Remaining tasks (out of scope for this work unit)

- F3-PR1..4 (4.1–4.8), F4-PR1..2 (5.1–5.4), F5-PR1..3 (6.1–6.6) — untouched.
