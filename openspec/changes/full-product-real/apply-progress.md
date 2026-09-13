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

---

## Work Unit: F3-PR3 (tasks 4.5 + 4.6) — UnitBadge, ScannerTrigger + token retheme (retry 2)

Status: **implementation complete, all evidence green.**
Skills loaded: `frontend-design`, `work-unit-commits` (paths-injected).
Commit style: single commit (code + tests + `tasks.md` + this file).
Retry context: a prior attempt on this exact slice was killed by an API rate
limit before any edit landed; the tree was clean at `303db5a` when this retry
started, so there was no partial state to reconcile.

### Completed tasks

| Task | State | Commit |
|------|-------|--------|
| 4.5 RED — `UnitBadge`/`ScannerTrigger` tests + retheme source-scan assertions on 6 existing primitives | [x] | `feat(ui): UnitBadge, ScannerTrigger primitives and token retheme` |
| 4.6 GREEN — `UnitBadge.tsx` + `ScannerTrigger.tsx` | [x] | same commit |

### Key finding — the 6 existing primitives were already token-only

Before writing any test, a source grep of `Button.tsx`, `NumericInput.tsx`,
`SearchInput.tsx`, `Status.tsx`, `ItemCard.tsx`, `LiveRegion.tsx` against the
hex / font-family / px-radius patterns used by the F3-PR2 `Modal`/`Progress`
source-scan tests (and `theme.tokens.test.ts`'s stricter scan, which only
covers `src/app/**` + `src/features/**`, never `shared/ui/primitives/**`)
found **zero matches in all 6 files**. These primitives already style purely
through AntD components + non-functional Tailwind-shaped class-name markers
(this repo has **no Tailwind/PostCSS pipeline at all** — confirmed via
`package.json`, `vite.config.ts`, and no `.css` import anywhere; those
class names are pre-existing documentation-only markers, not functioning
CSS). Task 4.6's "replace hardcoded styles with token references" therefore
had nothing to replace in the 6 files; the real GREEN work is the two new
primitives. This is recorded here rather than silently narrowing scope.

### Focus-ring / target-size requirement — implementation choice and honest limitation

The visual-shell delta spec requires a visible `2px #0B5CD6` focus ring
(2px offset) and ≥24×24 px pointer targets. Given no CSS build pipeline
exists in this repo, and per `strict-tdd.md`'s explicit rule **"CSS class
assertions are NEVER valid test assertions... use a visual regression tool
for that"**, this work unit does NOT introduce a new custom CSS/JS focus-ring
mechanism (which would be untestable in jsdom and unverifiable in review) and
does NOT add new class-name assertions. Instead, `ScannerTrigger` and
`UnitBadge` are composed entirely from already-vetted primitives (`Button`,
`Modal`, `SearchInput`, AntD `Input`) so any target-size/focus behavior those
already carry via `ConfigProvider` token inheritance applies transitively —
this is the "or rely on AntD token inheritance" option task 4.6 explicitly
allows. Pixel-exact focus-ring verification is out of scope for a
jsdom/RTL primitive suite; a Playwright/E2E visual pass is the correct venue
and is not part of this slice.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.5/4.6 UnitBadge | `src/shared/ui/primitives/UnitBadge.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ unit-only / unit+label / no-interactive-role / source-scan cases | ➖ minimal, already clean |
| 4.5/4.6 ScannerTrigger | `src/shared/ui/primitives/ScannerTrigger.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ open-dialog / keyboard-Enter / manual-add reveal / disabled-until-both-fields-then-submit / source-scan | ➖ minimal, already clean |
| 4.5 Button retheme | `src/shared/ui/primitives/Button.test.tsx` | Unit (source-scan) | ✅ baseline 4/4 pass | ✅ Written | ✅ 5/5 (approval — file already literal-clean) | ➖ single scan assertion, structural | ➖ none needed |
| 4.5 NumericInput retheme | `src/shared/ui/primitives/NumericInput.test.tsx` | Unit (source-scan) | ✅ baseline 3/3 pass | ✅ Written | ✅ 4/4 (approval) | ➖ single scan assertion, structural | ➖ none needed |
| 4.5 SearchInput retheme | `src/shared/ui/primitives/SearchInput.test.tsx` | Unit (source-scan) | ✅ baseline 4/4 pass | ✅ Written | ✅ 5/5 (approval) | ➖ single scan assertion, structural | ➖ none needed |
| 4.5 Status retheme | `src/shared/ui/primitives/Status.test.tsx` | Unit (source-scan) | ✅ baseline 2/2 pass | ✅ Written | ✅ 3/3 (approval — extends the file's pre-existing DOM-level hex check) | ➖ single scan assertion, structural | ➖ none needed |
| 4.5 ItemCard retheme | `src/shared/ui/primitives/ItemCard.test.tsx` | Unit (source-scan) | ✅ baseline 2/2 pass | ✅ Written | ✅ 3/3 (approval) | ➖ single scan assertion, structural | ➖ none needed |
| 4.5 LiveRegion retheme | `src/shared/ui/primitives/LiveRegion.test.tsx` | Unit (source-scan) | ✅ baseline 3/3 pass | ✅ Written | ✅ 4/4 (approval) | ➖ single scan assertion, structural | ➖ none needed |

- **Approval tests** (refactoring/regression-guard): 6 — the retheme scans on
  `Button`/`NumericInput`/`SearchInput`/`Status`/`ItemCard`/`LiveRegion` are
  approval tests: they capture the current (already-compliant) source state
  as a permanent regression guard, per `strict-tdd.md`'s approval-testing
  section. `UnitBadge`/`ScannerTrigger` are genuine new-code RED→GREEN.
- **Pure functions created**: 0 (`canSubmit` in `ScannerTrigger` is a
  one-line presentational gate, analogous to `Progress`'s existing percent
  clamp — not extracted since it has a single call site).
- Triangulation: `ScannerTrigger`'s disabled→enabled→submit sequence forces
  real conditional logic (not fake-it); `UnitBadge` triangulates unit-only vs
  unit+label rendering.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `npx vitest run src/shared/ui/primitives` → **57/57 pass, 12 files** (was 41/41, 10 files) |
| Full suite | `npm run test:run` → first run hit a flaky 5s timeout in the unrelated, untouched `tests/app.smoke.test.tsx` keyboard-login test under parallel load; isolated re-run of that file passed 10/10, and `npm run test:run -- --no-file-parallelism` passed **288/288, 48 files** clean. No regression. |
| Typecheck | `npm run typecheck` → exit 0, clean |
| Lint | `npm run lint` → exit 0, clean |
| FSD | `npm run fsd` → no violations (123 modules, 484 deps) |
| Runtime harness | RTL render + keyboard interaction (focus + `Enter`, click) is the runtime boundary for `ScannerTrigger`'s open/manual-add/submit flow. No network path. |
| Rollback boundary | Delete `src/shared/ui/primitives/{UnitBadge,ScannerTrigger}.{tsx,test.tsx}`; revert the added `it(...)` blocks in `Button.test.tsx`, `NumericInput.test.tsx`, `SearchInput.test.tsx`, `Status.test.tsx`, `ItemCard.test.tsx`, `LiveRegion.test.tsx`; revert `tasks.md`/`apply-progress.md` edits in this commit. No production `.tsx` of the 6 existing primitives was modified. |

### Files changed

| File | Action | What |
|------|--------|------|
| `src/shared/ui/primitives/UnitBadge.tsx` | Created | read-only exact/untranslated ERP unit + optional translated label, no interactive behavior |
| `src/shared/ui/primitives/UnitBadge.test.tsx` | Created | 5 tests: unit verbatim, label+unit, unit-only, no interactive role, source-scan |
| `src/shared/ui/primitives/ScannerTrigger.tsx` | Created | barcode/name-search trigger → `Modal` + `SearchInput`, manual-add fallback with explicit name+unit fields gated by both non-empty |
| `src/shared/ui/primitives/ScannerTrigger.test.tsx` | Created | 5 tests: opens dialog, keyboard-Enter activation, manual-add reveal, disabled-until-filled + submit, source-scan |
| `src/shared/ui/primitives/Button.test.tsx` | Modified | +1 source-scan retheme test |
| `src/shared/ui/primitives/NumericInput.test.tsx` | Modified | +1 source-scan retheme test |
| `src/shared/ui/primitives/SearchInput.test.tsx` | Modified | +1 source-scan retheme test |
| `src/shared/ui/primitives/Status.test.tsx` | Modified | +1 source-scan retheme test |
| `src/shared/ui/primitives/ItemCard.test.tsx` | Modified | +1 source-scan retheme test |
| `src/shared/ui/primitives/LiveRegion.test.tsx` | Modified | +1 source-scan retheme test |
| `openspec/changes/full-product-real/tasks.md` | Modified | 4.5 + 4.6 `[x]` with evidence notes |
| `openspec/changes/full-product-real/apply-progress.md` | Modified | this section |

### Deviations from design

- Task 4.6 named "replace hardcoded styles in the 6 existing primitives with
  token references" — no literal replacement was needed or performed; all 6
  were already literal-clean (see "Key finding" above). No semantic
  deviation: the retheme *guarantee* is now test-enforced where it previously
  was not (the existing `theme.tokens.test.ts` scan never covered
  `shared/ui/primitives/**`).
- The literal "2px solid #0B5CD6, offset 2px" focus ring is not independently
  implemented or pixel-tested in this slice; see "Focus-ring / target-size"
  note above. Recommend a follow-up Playwright/E2E visual pass before F3
  closes if pixel-exact conformance needs sign-off.
- `ScannerTrigger`'s manual-add submit gate (`canSubmit`) is a small
  presentational conditional inside the primitive, not caller-supplied
  (unlike `ItemCard.actionDisabled`), because the assigned requirement text
  frames "explicit name + unit" as the primitive's own contract, not merely
  the caller's obligation.

### Native attempt ledger — blocked on maintainer reset (not a code failure)

`gentle-ai sdd-attempt acquire` (after declaring the 4 new untracked files via
`--untracked-scope=select`) returned:

```
state: blocked
reason: maintainer_decision
exit: SDD runtime objective changed without an explicit reset: reset the
  objective, then begin again — gentle-ai sdd-attempt reset --cwd
  "/mnt/developments/ica-frontend" --change "full-product-real"
  --expected-revision "sha256:ecbe2e66c37c8c4162bf52bca4f59b8cc681ced4be7efc279be04bf29e12b042"
  --request-id "<unique-request-id>" --reason "<why-the-objective-changed>"
  --actor "<actor>"
```

This is the same category of ledger condition already documented for F1-PR3
and F3-PR1 in this file (objective/base-tree drift the executor cannot clear
unilaterally). Per orchestrator instruction, this bookkeeping block is
recorded here and does not gate reporting real, green implementation
evidence. No `sdd-attempt settle` was attempted since `acquire` never reached
`state: proceed`. A maintainer can run the `reset` command above (with a
fresh `--expected-revision` taken from `gentle-ai sdd-attempt status` at the
time, since this document's HEAD will have moved past `ecbe2e66…` once this
commit lands).

---

## Work Unit: F3-PR4 (tasks 4.7 + 4.8) — Guided + manual capture screens, 422 confirm-resend

Status: **implementation complete, all evidence green.**
Skills loaded: `frontend-design`, `work-unit-commits` (paths-injected).
Commit style: single commit (code + tests + `tasks.md` + this file), per
explicit orchestrator instruction for this slice.

### Completed tasks

| Task | State | Commit |
|------|-------|--------|
| 4.7 RED — extend `GuidedCapture.test.tsx`, new `ManualCapture.test.tsx`, new `change-input.test.ts` | [x] | `feat(capture): guided and manual blind capture screens` |
| 4.8 GREEN — `change-input.ts` builder, `ManualCapture.tsx`, `i18n.ts`, `es.json` completion | [x] | same commit |

### Discovery — `GuidedCapture`/`useGuidedCapture` already existed, unwired to any route

Before writing RED tests, a codegraph exploration of `GuidedCapture`,
`useGuidedCapture`, `useCaptureForm`, `CaptureTable` found that
`src/features/capture/guided/GuidedCapture.tsx` +
`src/features/capture/guided/useGuidedCapture.ts` already implemented the
full guided one-line-assistant loop (Enter save/auto-advance, saved lines
stay editable via search, blind pending lookup, advisory 422 confirm-resend)
with green tests — predating this SDD change's phase numbering (internal
doc comments still say "F3-PR2"; the blocked-ledger note under F3-PR3 above
references an even earlier `F6-P2-dashboard-guided` work unit name). However
`src/pages/screens.tsx`'s `AttemptCapturePage` renders `CaptureTable`
unconditionally — `GuidedCapture` was never wired into any page or route.
`BodegasList.tsx` already lets the operator pick `guided`/`manual` mode
before starting an attempt (`AttemptMode` on `Attempt`), but nothing reads
that mode back on the capture page. This is recorded as a known gap; routing
`AttemptCapturePage` by `attempt.mode` to `GuidedCapture`/`ManualCapture`
needs a `getAttempt(attemptId)` port method that does not exist yet, and is
explicitly out of scope for this slice (tasks 4.7/4.8 scope "the two capture
screens", not app-level routing/wiring — the stated rollback boundary is
`features/capture/guided`,`/manual` + `change-input.ts`, not
`pages/screens.tsx`).

### Approach

- **`change-input.ts`** (new): extracted the `ChangeInput`/`CaptureChange`
  builder (`buildChangeInput`, `buildConfirmChange`) out of
  `useGuidedCapture.ts` into its own module, per the design's explicit
  "ChangeInput builder" naming. `useGuidedCapture.ts` now imports it and
  re-exports `buildConfirmChange` so the existing
  `useGuidedCapture.test.tsx` import (`from './useGuidedCapture'`) keeps
  working unmodified. `saveCurrent` now calls `buildChangeInput` instead of
  constructing the `CaptureChange` object inline.
- **`ManualCapture.tsx`** (new): reuses `useGuidedCapture(attemptId, 'manual')`
  directly — that hook, given `mode: 'manual'`, already starts with no line
  selected and never auto-advances after a save (verified: the `mode ===
  'guided'` guards on both the mount-time auto-select effect and
  `advanceAfterSave` already make `'manual'` behave exactly as the manual
  requirement needs). `ManualCapture` only supplies the manual-specific
  composition: `ScannerTrigger` (search + manual-add fallback, matched
  against this attempt's own catalog since there is no backend contract yet
  for an unseen SKU) instead of guided's bare inline `SearchInput`, plus a
  separate `Modal`-based blind pending-identity lookup and the same
  422-confirm-resend dialog pattern as guided.
- **`i18n.ts`** (new): `buildGuidedCaptureStrings(t)` /
  `buildManualCaptureStrings(t)` adapters mapping the new `guidedCapture` /
  `manualCapture` `es.json` namespaces (plus the existing shared
  `capture.*` keys) onto the two screens' `Strings` prop shape — both
  screens stay `t()`-free themselves (existing convention: "every
  user-facing string arrives via props").
- `GuidedCapture.tsx` itself was **not modified** (only its test file was
  extended) — its existing `mode` prop already supports both guided and
  manual internally; per "Discovery" above, its own `'manual'` branch is now
  redundant with the new dedicated `ManualCapture` screen and is left as
  documented dead code rather than risking a wider, riskier edit to
  already-green production code in this slice.

### jsdom note — AntD `Modal` freezes its children during an incomplete exit animation

While writing the `Ctrl+K`/`Esc` test for `ManualCapture`'s `ScannerTrigger`
dialog, instrumented debugging (temporary `console.log`s, removed before
finalizing) proved: (1) `Escape` on the modal's wrap node correctly invokes
rc-dialog's own `onWrapperKeyDown` → `onClose` (confirmed via a spy in an
isolated `ScannerTrigger` harness); (2) `ManualCapture`'s own `closeScan`
state update **does** run and **does** re-render the component with
`query: ''`. But the actual mounted `<input>` inside the `Modal` keeps
showing the pre-close value indefinitely, because jsdom never fires the
`transitionend`/animation-frame events AntD's CSS-motion "leave" phase waits
for, and AntD freezes the "closing" content until that phase completes. This
extends the jsdom-animation-timing limitation already documented under
F3-PR2 (Modal/Drawer focus-entry) to the "close reflects new props" case.
**Resolution**: `ManualCapture.test.tsx`'s `Ctrl+K` test asserts only that
the dialog **opens** (a real wiring gap that needed coverage); Escape-closes
is not re-asserted at this composition level since it is already proven at
the primitive level (`Modal.test.tsx`'s `"closes on Escape"` case, which
asserts the `onClose` callback, not DOM removal or prop reflection).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.7/4.8 `change-input` | `src/features/capture/change-input.test.ts` | Unit | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ exact-string passthrough + authoritative-unit + confirm-flag + default method + no-mutation-across-resend | ✅ `useGuidedCapture.ts` refactored to use it; existing 5 capture-suite files stayed green (52/52) |
| 4.7/4.8 guided keyboard loop | `src/features/capture/guided/GuidedCapture.test.tsx` | Integration (RTL) | ✅ baseline 3/3 pass | ✅ new case written against real behavior (approval-style: guided's `next`/`prev`/`resolveShortcut` wiring pre-existed) | ✅ 4/4 | ✅ arrow-prev + arrow-next + `Ctrl+K` open + `Esc` close in one flow | ➖ none needed |
| 4.7/4.8 `ManualCapture` | `src/features/capture/manual/ManualCapture.test.tsx` | Integration (RTL) | N/A (new) | ✅ module unresolved | ✅ 5/5 | ✅ starts-empty-then-picked + blind-pending-lookup + `Ctrl+K`-opens + save-stays-no-advance + 422-confirm-resend | ➖ minimal composition |
| 4.7/4.8 `i18n` builders | `src/features/capture/i18n.test.ts` | Unit | N/A (new) | ✅ module unresolved | ✅ 3/3 | ✅ guided strings + interpolation-preserves-exact-string + manual strings | ➖ none needed |

- **Approval tests**: the new `GuidedCapture.test.tsx` case is approval-style
  against already-implemented `next`/`prev`/`resolveShortcut` wiring (see
  "Discovery" above) — it did not drive new production code, only closed a
  coverage gap at the integration level (previously only unit-tested via
  `resolveShortcut` in isolation).
- **Pure functions created**: `buildChangeInput` (new), `buildConfirmChange`
  (moved, signature unchanged), `stateLabels` (private helper in `i18n.ts`).
- Triangulation: `change-input.test.ts`'s "never mutates the quantity string
  between the initial send and the confirm resend" case exercises both
  builders together against the exact-string contract, not just each in
  isolation.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `npx vitest run src/features/capture` → **58/58 pass, 9 files** (baseline 41/41 across the capture slice pre-unit) |
| Full suite | `npm run test:run` → 1 unrelated flaky timeout in `tests/app.smoke.test.tsx`'s keyboard-login test under parallel load (same known flake documented under F3-PR3); `npm run test:run -- --no-file-parallelism` → **304/304 pass, 51 files** clean |
| Typecheck | `npm run typecheck` → exit 0, clean |
| Lint | `npm run lint` → exit 0, clean |
| FSD | `npm run fsd` → no violations (129 modules, 517 deps) — required fixing `i18n.test.ts` to inline translations instead of importing `es.json` directly (features must not depend on `app/`), matching `CaptureTable.test.tsx`'s existing convention |
| Runtime harness | RTL render + keyboard/pointer interaction (search-pick, save, 422-confirm, `Ctrl+K`) is the runtime boundary for both screens; no network path (mock port) |
| Rollback boundary | Revert this commit. Touches only `src/features/capture/{change-input.ts,change-input.test.ts,i18n.ts,i18n.test.ts}`, `src/features/capture/manual/` (new dir), `src/features/capture/guided/{GuidedCapture.test.tsx,useGuidedCapture.ts}`, `src/app/i18n/es.json`. `GuidedCapture.tsx`, `CaptureTable.tsx`, `useCaptureForm.ts`, and all routing/`pages/` files are untouched. |

### Files changed

| File | Action | What |
|------|--------|------|
| `src/features/capture/change-input.ts` | Created | `buildChangeInput` + `buildConfirmChange` (contract-exact `ChangeInput`/`CaptureChange` builder) |
| `src/features/capture/change-input.test.ts` | Created | 5 tests: exact-string passthrough, authoritative-unit, confirm-flag, default method, no-mutation-across-resend |
| `src/features/capture/guided/useGuidedCapture.ts` | Modified | `buildConfirmChange` moved to `change-input.ts` (re-exported here); `saveCurrent` now calls `buildChangeInput` |
| `src/features/capture/guided/GuidedCapture.test.tsx` | Modified | +1 test: arrow prev/next + `Ctrl+K` open + `Esc` close, integration-level |
| `src/features/capture/manual/ManualCapture.tsx` | Created | Manual capture screen composed from `ItemCard`/`NumericInput`/`Button`/`ScannerTrigger`/`Modal`/`LiveRegion`, reusing `useGuidedCapture(attemptId, 'manual')` |
| `src/features/capture/manual/ManualCapture.test.tsx` | Created | 5 tests: starts-empty-then-picked, blind-pending-lookup, `Ctrl+K`-opens-scanner, save-stays-no-advance, 422-confirm-resend |
| `src/features/capture/i18n.ts` | Created | `buildGuidedCaptureStrings` / `buildManualCaptureStrings` adapters from `t()` to each screen's `Strings` prop |
| `src/features/capture/i18n.test.ts` | Created | 3 tests: guided strings, exact-string interpolation, manual strings (inline translations, not importing `es.json`, to respect the FSD `features`→`app` boundary) |
| `src/app/i18n/es.json` | Modified | added `guidedCapture` (18 keys) and `manualCapture` (11 keys) namespaces |
| `openspec/changes/full-product-real/tasks.md` | Modified | 4.7 + 4.8 `[x]` with evidence notes |
| `openspec/changes/full-product-real/apply-progress.md` | Modified | this section |

### Deviations from design / tasks.md

- `ManualCapture` does **not** implement "add a truly new/unseen SKU" via
  `ScannerTrigger`'s manual-add fallback — there is no port method to
  register an ad hoc line, so manual-add matches the typed name+unit against
  this attempt's own catalog only. Documented inline in `ManualCapture.tsx`.
- `GuidedCapture.tsx` keeps its pre-existing `mode === 'manual'` branch
  un-removed (see "Discovery" above); it becomes redundant once a future
  slice wires `AttemptCapturePage` to route by `attempt.mode`. Not removed
  here to avoid touching already-green, unwired production code outside
  this slice's stated scope.
- Routing/wiring `GuidedCapture`/`ManualCapture` into `pages/screens.tsx` is
  **not** part of this slice (tasks 4.7/4.8 name the two screens and the
  `change-input.ts` builder as the deliverable; the rollback boundary in the
  tasks.md workload table does not list `pages/`). Needs a `getAttempt`
  port method first (F4/F5 or a small follow-up task) since
  `AttemptCapturePage` currently only has `attemptId` from the URL, not the
  attempt's `mode`.
- Reviewable diff for this work unit is **832 changed lines** (807
  insertions + 25 deletions across 9 files, per `git diff --cached --stat`),
  above the 400-line default budget and above this slice's own forecast row
  (150–350). Per `work-unit-commits`, this was not shrunk to fit — tests
  were kept with the behavior they verify and no comments/docs were
  trimmed. Drivers: two full new-screen test suites (5 cases each) plus a
  string-builder module and its test, delivered as one deliberate unit per
  explicit orchestrator instruction for this slice ("ONE commit for this
  slice"). Recommend `size:exception` for this PR if it is reviewed as a
  single unit, or a maintainer-directed re-split (e.g. `change-input.ts` +
  guided keyboard-loop test as one commit, `ManualCapture` + `i18n.ts` as a
  second) before opening a PR.

### Issues found

- None beyond the jsdom `Modal` exit-animation limitation documented above
  (test-technique note, not a production defect).

---

## Work Unit: F3-PR5 (task 4.9) — Wire guided/manual capture routing (orchestrator-identified gap-closure)

Status: **implementation complete, all evidence green.**
Skills loaded: `frontend-design`, `sdd-apply`/`sdd-phase-common` (paths-injected).
Commit style: single commit (code + tests + `tasks.md` + this file).

### Why this work unit exists

F3-PR4 built `GuidedCapture` and `ManualCapture` but never wired either into a
route: `AttemptCapturePage` (`/capture/:attemptId`) still rendered the old
`CaptureTable` unconditionally. The orchestrator flagged this as the
highest-value remaining gap — the app showed none of the F3 visual work
without this fix — and added it as task 4.9 under a new Phase F3-PR5 section
(not present in the tasks.md this apply batch started from).

### Completed tasks

| Task | State | Commit |
|------|-------|--------|
| 4.9 RED/GREEN — thread `attempt.mode` through the capture route, route `AttemptCapturePage` by mode | [x] | `feat(capture): route guided and manual capture screens by attempt mode` |

### Approach

- **`BodegasList.tsx`**: `startMutation.onSuccess` already had `attempt.mode`
  in scope; changed `navigate(`/capture/${attempt.id}`)` to
  `navigate(`/capture/${attempt.id}?mode=${attempt.mode}`)`. A query param
  was chosen over router `state` because `state` does not survive a reload —
  the explicit failure mode this task calls out ("refresh-safe carrier").
- **`AttemptCapturePage`** (`src/pages/screens.tsx`): reads `attemptId` from
  `useParams()` and `mode` from `useSearchParams()`. `mode === 'manual'`
  renders `ManualCapture`; anything else (including missing/invalid, e.g. a
  stale bookmark predating this query param) falls back to `GuidedCapture`
  — chosen over a "start a new attempt" prompt because the attempt already
  exists and is addressable by `attemptId`; failing safe to the fuller
  guided assistant loses no capability. A defensive `!attemptId` branch
  (reusing the existing `review.notFound` key, matching `ReviewPage`'s
  pattern for a missing route param) covers the type-level `attemptId?:
  string` case, though the router always supplies it for a matched
  `capture/:attemptId` route.
- `CaptureTable` was **not deleted** — per explicit scope, checked all
  remaining references first (`rg -n CaptureTable src`): only its own three
  test files import it after this change. Left in place as documented dead
  code; auditing every caller before removal was out of scope for this slice.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.9 mode query param | `src/features/bodegas/BodegasList.start.test.tsx` | Integration (RTL router) | ✅ baseline 2/2 pass | ✅ RED — 2/2 fail (`search` was `''`, expected `?mode=guided`/`?mode=manual`) | ✅ 2/2 pass | ✅ guided case + manual case (different `AttemptMode` values) already present as the two existing scenarios | ➖ none needed |
| 4.9 `AttemptCapturePage` routing | `src/pages/AttemptCapturePage.test.tsx` | Integration (RTL router) | N/A (new file) | ✅ RED — 4/4 fail (old `CaptureTable` unconditional render; `Avance N de N` / `Escanear o buscar` never appeared) | ✅ 4/4 pass | ✅ guided renders + manual renders + missing-mode fallback + invalid-mode fallback (4 distinct branches through the same `mode` conditional) | ➖ none needed |

- **Approval tests**: none — this is new routing behavior, not a refactor of
  existing behavior (the previous `CaptureTable` render had no test coverage
  for the mode-routing case since it never existed).
- **Pure functions created**: 0 (the `mode === 'manual' ? 'manual' : 'guided'`
  fallback is a one-line conditional, not extracted — single call site,
  matches the file's existing style for e.g. `CapturePage`'s inline
  `<Navigate>`).
- Triangulation: all 4 branches of the `AttemptCapturePage` mode conditional
  (guided / manual / missing / invalid) are independently exercised; missing
  and invalid both hit the same fallback path deliberately (proving the
  fallback is a real default, not merely "guided happens to be first").

### FSD boundary note (test-only)

The first draft of `AttemptCapturePage.test.tsx` imported the real i18n
singleton from `../app/i18n/config` (mirroring `tests/app.smoke.test.tsx`'s
pattern) to avoid retyping the `guidedCapture`/`manualCapture` translation
keys. `npm run fsd` correctly rejected this: `src/pages/**` must not depend
on `src/app/**`. Fixed by building a self-contained inline `i18next` instance
in the test file (same convention as `CaptureTable.test.tsx` and
`ManualCapture.test.tsx`), scoped to exactly the `capture`/`guidedCapture`/
`manualCapture` keys the two screens' string-builders consume.

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command + result | `npx vitest run src/pages/AttemptCapturePage.test.tsx src/features/bodegas/BodegasList.start.test.tsx src/features/bodegas/BodegasList.test.tsx --no-file-parallelism` → **10/10 pass, 3 files** |
| Full suite | `npm run test:run -- --no-file-parallelism` → **308/308 pass, 52 files** (baseline 304/304, 51 files; +4 new tests, +1 new file) |
| Typecheck | `npm run typecheck` → exit 0, clean |
| Lint | `npm run lint` → exit 0, clean |
| FSD | `npm run fsd` → no violations (130 modules, 529 deps) |
| Runtime harness | RTL render + router navigation is the runtime boundary: `MemoryRouter` + `Routes` drives the real `useParams`/`useSearchParams` resolution exactly as the browser router would for `/capture/:attemptId?mode=...`. No network path (mock port). |
| Rollback boundary | Revert this commit. Touches only `src/features/bodegas/BodegasList.tsx` (1 line), `src/features/bodegas/BodegasList.start.test.tsx` (+2 assertions), `src/pages/screens.tsx` (`AttemptCapturePage` + imports), `src/pages/AttemptCapturePage.test.tsx` (new). `CaptureTable.tsx`, `GuidedCapture.tsx`, `ManualCapture.tsx`, and `useGuidedCapture.ts` are untouched. |

### Files changed

| File | Action | What |
|------|--------|------|
| `src/features/bodegas/BodegasList.tsx` | Modified | `navigate` call now appends `?mode=${attempt.mode}` |
| `src/features/bodegas/BodegasList.start.test.tsx` | Modified | +2 assertions: `router.state.location.search` is `?mode=guided`/`?mode=manual` |
| `src/pages/screens.tsx` | Modified | `AttemptCapturePage` reads `mode` via `useSearchParams()`, renders `GuidedCapture`/`ManualCapture` (was: unconditional `CaptureTable`); added a defensive missing-`attemptId` branch |
| `src/pages/AttemptCapturePage.test.tsx` | Created | 4 tests: guided renders, manual renders, missing-mode fallback, invalid-mode fallback |
| `openspec/changes/full-product-real/tasks.md` | Modified | new Phase F3-PR5 section, task 4.9 `[x]` with evidence |
| `openspec/changes/full-product-real/apply-progress.md` | Modified | this section |

### Deviations from design

- Not anticipated by `design.md`'s "File Changes" table (scoped to F1) or by
  the original tasks.md (task 4.9 did not exist before this apply batch —
  added by the orchestrator as a gap-closure task). No semantic deviation
  from F3-PR4's own design note, which explicitly named this exact gap
  ("a future integration task should route `AttemptCapturePage` by
  `attempt.mode`") as its own recommended follow-up.
- `GuidedCapture.tsx`'s own now-fully-redundant internal `mode === 'manual'`
  branch (documented as dead code under F3-PR4) is still not removed here —
  `AttemptCapturePage` always calls `GuidedCapture` with `mode="guided"`
  literally, never routing it to manual, so that internal branch remains
  unreachable through this route. Removing it was not part of task 4.9's
  scope (routing, not `GuidedCapture`'s internals) and risks touching
  already-green, previously-unwired production code beyond this slice's
  rollback boundary.

### Issues found

- None. `CaptureTable` audit (`rg -n CaptureTable src`) confirms it has no
  remaining production callers after this change — left in place per
  explicit instruction, not deleted.

### Native attempt ledger — settle blocked on untracked-inventory digest (not a code failure)

`gentle-ai sdd-attempt acquire --work-unit "F3-PR5 wire guided/manual capture
routing" --max-attempts 3 --max-changed-lines 300` → `state: proceed`, token
`sha256:eb33ae56c0b4d4527309feb6fd51208bc81d48cf0243a0ce84f31f71d87fc078`.

`gentle-ai sdd-attempt settle --outcome passed --evidence-revision
sha256:3bc28d90d9f2c25c1ae1d21ae9e28d3dd6343571878e795da73ef0cdc975a73d
--untracked-scope exclude` → rejected: `untracked selection requires
--untracked-scope and --expected-untracked-inventory; run "gentle-ai review
status ... --next-transition" to obtain the canonical inventory`.

Cause: this apply session ran `gentle-ai codegraph init` (CodeGraph guidance
mandates lazy-init before structural exploration when `.codegraph/` is
missing), which left an untracked `.codegraph/` directory in the worktree —
unrelated to this task's code. The settle CLI now requires an
`--expected-untracked-inventory` digest sourced from the review-lifecycle
STATUS command. Per this executor's role boundary (apply must not enter the
review/4R lifecycle — that is orchestrator-owned, post-verify), this was not
chased further; `.codegraph/` was also deliberately left out of this
commit's `git add` (see "Files changed" — only the 6 feature/doc files were
staged). A maintainer or the orchestrator can supply the inventory digest
(via the review-status preflight, or by `.gitignore`-ing `.codegraph/`) and
resettle with the same evidence revision above.

Retained attempt token:
`sha256:eb33ae56c0b4d4527309feb6fd51208bc81d48cf0243a0ce84f31f71d87fc078`
Evidence revision (sha256 of git HEAD `de35c79…`):
`sha256:3bc28d90d9f2c25c1ae1d21ae9e28d3dd6343571878e795da73ef0cdc975a73d`

The code work for task 4.9 is complete and fully verified (308/308,
typecheck/lint/fsd clean); this ledger block does not change that. Reviewable
diff for this work unit is 181 lines (excluding this doc-bookkeeping commit
content), well under the 300-line cap set for this attempt.
