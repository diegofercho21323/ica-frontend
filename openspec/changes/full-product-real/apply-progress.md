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

- F3-PR2..4 (4.3–4.8), F4-PR1..2 (5.1–5.4), F5-PR1..3 (6.1–6.6) — untouched.

---

## Work Unit: F3-PR1 (tasks 4.1 + 4.2) — Tallycore AntD tokens + AA contrast table

Status: **implementation complete, all evidence green.**
Skills loaded: `frontend-design`, `work-unit-commits` (paths-injected).

### Completed tasks

| Task | State | Commit |
|------|-------|--------|
| 4.1 RED comprehensive Tallycore token + AA + static-scan test | [x] | `9bff03b` feat(theme): Tallycore AntD tokens with AA contrast table |
| 4.2 GREEN Tallycore token set + theme mapping + contrast table | [x] | `9bff03b` (same work unit) |

### Approach — reconciled existing files (no parallel `theme/tokens.ts`)

The tasks.md text named `src/app/theme/tokens.ts` but the repo already had
`src/app/tokens.ts` + `src/app/theme.ts` + `src/app/theme.tokens.test.ts` +
`providers.tsx` `ConfigProvider`. Per orchestrator instruction, reconciled those
in place instead of creating parallel modules. `src/app/theme/` now holds only
`contrast-table.md`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `src/app/theme.tokens.test.ts` | Unit | ✅ baseline: old test 6/6 green (Datup values) | ✅ rewritten, 5/14 fail vs old tokens (`colorPrimary` undefined, font-family Manrope, `fontSize` undefined, mapping mismatch) | ✅ 14/14 pass after token+theme rewrite | ✅ 8 distinct AA pairs via `it.each` + 3 mapping cases + font-scale ascending case + guard-the-guard scan (finds hex in `tokens.ts`, none in `src/app`/`src/features`) | ✅ shared `SPEC` map + `collectSources` walker, no duplication |

- **Approval tests**: `tests/theme.tokens.test.ts` and `tests/visual-shell.test.tsx` first case acted as approval tests — updated to the new key names/values, still assert "theme derives from tokens.ts, no hex in shell sources".
- **Pure functions created**: 2 in the test (`luminance`, `ratio` — WCAG G17/G18); production code is a config object, no branching.
- Triangulation not skipped: 8 AA pairs + 3 layout-mapping assertions exercise every token value independently.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `npx vitest run src/app/theme.tokens.test.ts` → **14/14 pass** (was 5 fail / 14 at RED) |
| Full suite | `npm run test:run` → **251/251 pass, 42 files** (was 246/246; +5 net from the expanded token test) |
| Typecheck | `npm run typecheck` → exit 0, clean |
| Lint | `npm run lint` → exit 0, clean |
| FSD | `npm run fsd` → no violations (111 modules, 408 deps) |
| Runtime harness | N/A — token config object resolved at import; no network/runtime boundary. Full RTL suite (`visual-shell.test.tsx` renders `<App />` through `ConfigProvider`) is the integration surface and is green. |
| Rollback boundary | Revert commit `9bff03b`. Touches only `src/app/tokens.ts`, `src/app/theme.ts`, `src/app/theme.tokens.test.ts`, `src/app/theme/contrast-table.md` (new), `tests/theme.tokens.test.ts`, `tests/visual-shell.test.tsx`, `tasks.md`. No feature/primitive code touched; `providers.tsx` unchanged. |

### AA contrast nudges (task 4.2 — recorded as required)

Two raw spec hex values failed white-text AA on their solid fill:

| Token | Spec hex | White ratio (spec) | Nudged hex | White ratio (final) |
|---|---|---|---|---|
| `colorSuccess` | `#1F8A4C` | 4.38:1 ❌ | `#1C8449` | 4.72:1 ✅ |
| `colorWarning` | `#B26A00` | 4.24:1 ❌ | `#A86400` | 4.68:1 ✅ |

Minimal single-step darkening, same hue, still swappable at `ConfigProvider`.
Full table: `src/app/theme/contrast-table.md`. All 8 text/bg pairs now ≥4.5:1.

### Files changed

| File | Action | What |
|------|--------|------|
| `src/app/tokens.ts` | Modified | Datup violet set → Tallycore set; added `colorTextSecondary`, `fontSize`; renamed keys to AntD-semantic names; doc comment |
| `src/app/theme.ts` | Modified | maps all Tallycore tokens (incl. `colorBgLayout`, `colorTextSecondary`, `fontSize`); `components.Layout` kept, now derives from `colorBgContainer`/`colorBgLayout`/`colorText` |
| `src/app/theme.tokens.test.ts` | Modified | full rewrite: spec-table assertions, pinned font stack + scale, 8 AA pairs, recursive static brand-literal scan |
| `src/app/theme/contrast-table.md` | Created | WCAG 2.2 AA proof + nudge log |
| `tests/theme.tokens.test.ts` | Modified | new token key names; exhaustion + shell-hex scan preserved |
| `tests/visual-shell.test.tsx` | Modified | "Datup" → "Tallycore"; assert `#0B5CD6` / radius `6` / Inter |
| `openspec/changes/full-product-real/tasks.md` | Modified | 4.1 + 4.2 `[x]` with evidence |

### Deviations from design

- tasks.md named `src/app/theme/tokens.ts` + `src/app/theme/tokens.test.ts`; reconciled the pre-existing `src/app/tokens.ts` / `theme.ts` / `theme.tokens.test.ts` instead (orchestrator instruction). Same behavior, no parallel modules.
- `colorSuccess` / `colorWarning` differ from the raw spec hex by a minimal AA nudge (documented above). Spec explicitly allows token values to be tuned at the `ConfigProvider` layer.
- Commit message is `feat(theme): Tallycore AntD tokens with AA contrast table` (orchestrator wording) rather than tasks.md's shorter `feat(theme): Tallycore AntD tokens`.

### Attempt ledger — settle blocked on stale changed-line accounting (not a code failure)

`gentle-ai sdd-attempt acquire` → `state: proceed`, token `sha256:d418f227…`.

`gentle-ai sdd-attempt settle --outcome passed` → **recorded** attempt ordinal 12
as `outcome: passed`, then returned `state: blocked / maintainer_decision`.

Cause: the ledger charges the *combined 2-commit branch diff* (`465` lines) to
the attempt and flags `changed_line_budget_exceeded` / `decision_required` /
`next_action: reset`. The reviewable code+test change is **384 lines** (commit
`9bff03b`, under the 400 budget); the overflow is the ~80-line SDD bookkeeping
commit `docs(sdd)` + `tasks.md` checkboxes, which are pipeline artifacts, not
reviewer code. Per work-unit-commits, docs/bookkeeping are not shrunk to hit the
number.

This is the same non-executor-clearable ledger condition documented for F1-PR3.
A maintainer must run:

```
gentle-ai sdd-attempt reset --cwd /mnt/developments/ica-frontend --change full-product-real \
  --expected-revision sha256:4063adb6bfbc4b5b74af236f322474e9295a445a36371167c889e86110fb41ff \
  --request-id "<unique>" --reason "F3-PR1 landed green (251/251, typecheck/lint/fsd clean); 384 reviewable lines under budget, overflow is SDD bookkeeping" --actor "<actor>"
```

Retained attempt token: `sha256:d418f227ab6b176bf4ca998101ddedfbc1fe4af6e5210ab164c39eedaf3f7eb5`
Evidence revision passed to settle: `sha256:a37b8f5a77d056abcc90ac2159ca394c653693e144e7cc29a1c8536439ecd2fb`
(status top-level `revision` for the reset: `sha256:4063adb6bfbc4b5b74af236f322474e9295a445a36371167c889e86110fb41ff`)

The code work for tasks 4.1 + 4.2 is complete and fully verified; the ledger
block does not change that.

---

## Work Unit: F3-PR2 (tasks 4.3 + 4.4) — Modal / Drawer / Table / Progress layout primitives

Status: **implementation complete, all evidence green.**
Skills loaded: `frontend-design`, `work-unit-commits` (paths-injected).
Commit style: single commit (code + tests + `tasks.md` + this file).

### Completed tasks

| Task | State | Commit |
|------|-------|--------|
| 4.3 RED — 4 primitive test files (dialog semantics, progressbar, table scroll region, token-only source scan) | [x] | `feat(ui): Modal, Drawer, Table, Progress layout primitives` |
| 4.4 GREEN — 4 thin typed AntD wrappers | [x] | same commit |

### Approach

Thin wrappers over AntD `Modal` / `Drawer` / `Table` / `Progress`, token-styled
only (zero hex/radius literals — enforced by a per-file source scan in each
test). Prop/style conventions match the sibling primitives (`Button`,
`ItemCard`, `SearchInput`): all user-facing strings arrive via props, no `t()`
inside `shared/`, no business logic. `primitives/` has no barrel file, so
consumers keep importing by path (existing convention).

- **Modal** — `onClose` maps to AntD `onCancel`; `closeLabel` sets the close
  control `aria-label` via `closable={{ 'aria-label' }}`. `keyboard` + `maskClosable`.
- **Drawer** — same shape, `onClose` passthrough, labelled close, `keyboard` + `maskClosable`.
- **Table** — generic `<Table<T>>`; wrapped in a `role="region"` `tabIndex={0}`
  labelled `overflow-x-auto` container so narrow widths get a bounded scroll
  region (per visual-shell) instead of clipped columns. `scroll={{ x: 'max-content' }}`,
  `pagination={false}` default.
- **Progress** — `value` / `max` → clamped percent; the wrapper div carries
  `role="progressbar"` + `aria-valuenow/min/max` and a visible text `label`;
  the sibling `LiveRegion` primitive announces `valueText` (never numeric- or
  color-only).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.3/4.4 Modal | `src/shared/ui/primitives/Modal.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ open/closed + Esc + close-control + focus-restore + source scan | ➖ minimal wrapper |
| 4.3/4.4 Drawer | `src/shared/ui/primitives/Drawer.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 6/6 | ✅ open/closed + Esc + scrim + close-control + focus-restore + source scan | ➖ minimal wrapper |
| 4.3/4.4 Table | `src/shared/ui/primitives/Table.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ headers + rows/cells + labelled scroll region + empty data + source scan | ➖ minimal wrapper |
| 4.3/4.4 Progress | `src/shared/ui/primitives/Progress.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ value/max bounds + live-region text + label-always + clamp + source scan | ✅ moved progressbar role to wrapper (AntD ProgressProps rejects `role`) |

- **Approval tests**: none — all four files are new.
- **Pure functions created**: 0 (percent clamp is a one-liner inside `Progress`).
- Triangulation not skipped: each file exercises ≥4 distinct behavioral paths plus the static source scan.

### jsdom notes (test technique, not production behavior)

- AntD `Modal`/`Drawer` `Esc` handling does not fire through `userEvent.keyboard('{Escape}')` in this jsdom setup; asserted with `fireEvent.keyDown(dialog, { key: 'Escape' })` instead, which drives the real `rc-dialog`/`rc-drawer` handler.
- Focus **entry** into the dialog is timing-flaky in jsdom; focus **restore** to the trigger on close is reliable and is what the tests assert, together with `aria-modal="true"` as the focus-trap contract.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `npx vitest run src/shared/ui/primitives/{Modal,Drawer,Table,Progress}.test.tsx` → **21/21 pass** (was 4 files unresolved at RED) |
| Full suite | `npm run test:run` → **272/272 pass, 46 files** (baseline 251/251, 42 files; +21 new, +4 files). Two consecutive clean runs. |
| Typecheck | `npm run typecheck` → exit 0, clean |
| Lint | `npm run lint` → exit 0, clean |
| FSD | `npm run fsd` → no violations (119 modules, 447 deps) — primitives import only `antd` + sibling `LiveRegion` |
| Runtime harness | RTL render + keyboard/pointer interaction is the runtime boundary (portals, focus, Esc, scrim). No network path. |
| Rollback boundary | Delete `src/shared/ui/primitives/{Modal,Drawer,Table,Progress}.{tsx,test.tsx}` and revert the `tasks.md` / `apply-progress.md` edits in this commit. No existing primitive, token, or feature file touched. |

### Files changed

| File | Action | What |
|------|--------|------|
| `src/shared/ui/primitives/Modal.tsx` | Created | thin AntD `Modal` wrapper; `onClose`→`onCancel`, labelled close |
| `src/shared/ui/primitives/Modal.test.tsx` | Created | 5 tests: titled dialog, focus-trap contract + restore, Esc, close control, source scan |
| `src/shared/ui/primitives/Drawer.tsx` | Created | thin AntD `Drawer` wrapper; labelled close, `keyboard`, `maskClosable` |
| `src/shared/ui/primitives/Drawer.test.tsx` | Created | 6 tests: labelled dialog, focus restore, Esc, scrim, close control, source scan |
| `src/shared/ui/primitives/Table.tsx` | Created | generic AntD `Table` wrapped in a labelled focusable scroll region |
| `src/shared/ui/primitives/Table.test.tsx` | Created | 5 tests: headers, rows/cells, scroll region, empty data, source scan |
| `src/shared/ui/primitives/Progress.tsx` | Created | `value`/`max` progressbar wrapper + `LiveRegion` announcement |
| `src/shared/ui/primitives/Progress.test.tsx` | Created | 5 tests: bounds, live region, label-always, clamp, source scan |
| `openspec/changes/full-product-real/tasks.md` | Modified | 4.3 + 4.4 `[x]` with evidence |
| `openspec/changes/full-product-real/apply-progress.md` | Modified | this section |

### Deviations from design

- `design.md` "File Changes" table is scoped to F1; it does not enumerate F3
  primitives. tasks.md line for F3-PR2 is the authoritative scope and was
  followed. Commit message uses the orchestrator wording
  `feat(ui): Modal, Drawer, Table, Progress layout primitives` rather than
  tasks.md's shorter `feat(ui): layout primitives`.
- `Progress` puts `role="progressbar"` on the wrapper `div` (not on AntD
  `Progress`) because `AntProgressProps` does not type `role`. AntD Progress
  stays as the visual track only. No semantic loss — bounds + label + live
  region are all present.

### Attempt ledger

`gentle-ai sdd-attempt acquire` → `state: proceed`, token
`sha256:81b080fc5de7877339ae05591bf2c120c58c86f9b67b1cc0ddfc9ca71f49b23c`.

`gentle-ai sdd-attempt settle --outcome passed
--evidence-revision sha256:79d536aff406ff8eba420f6e1222bfde6a6c2a245048489b88708c10e6c1b93b
--untracked-scope=exclude` (excluded the runtime-owned untracked file
`openspec/changes/full-product-real/.gentle-ai-instance`) → **`state: complete`**.
No maintainer decision required — reviewable diff for this work unit is well
under the 400-line budget. This is the first F-series work unit to settle
cleanly (F1-PR3 and F3-PR1 hit stale base-drift accounting; this attempt was
acquired against the current base).

### SDD status note (not a code issue)

`gentle-ai sdd-status full-product-real` reports
`blocked(edit_authority_missing)` because `tasks.md` names the edit root `"/"`
outside the authorized roots. This is an orchestrator/maintainer consent
concern (grant edit authority or annotate tasks.md), unrelated to this work
unit's code, which is complete and fully green.
