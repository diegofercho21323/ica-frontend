# Archive Report: frontend-capture

**Change**: frontend-capture
**Archived to**: `openspec/changes/archive/2026-09-08-frontend-capture/`
**Date**: 2026-09-08
**Mode**: both (openspec filesystem + Engram)
**Status**: SDD cycle complete — planned, implemented, verified, archived.

## Final State (at close)

Per the Final-State Authority hierarchy, this report describes the change AT CLOSE.
Intermediate snapshots (`apply-progress` file, `verify-report` file + #1718) describe
earlier moments; where they disagree with higher-ranked sources, the higher rank wins.

- **Tasks**: 16/16 complete. The persisted `tasks.md` (Task Completion Gate source of
  truth) shows all items checked (`grep -c "- [x]"` = 16, `grep -c "- [ ]"` = 0).
  The orchestrator's explicit final-state fact (16/16 complete) agrees. No stale
  checkboxes; no archive-time reconciliation was needed.
- **Verification**: `PASS`, 0 critical, 0 warnings, 2 cosmetic suggestions only.
  Evidence revision `work-unit-capture-verify-acq-1`
  (`test_output_hash: sha256:2e1c71790d067edf64f2f1daf3703492274fc7d6ffa57ef8f53092d420c41250`,
  `native_token: sha256:0c5b7188f88bd60194ca2d32d1a266249494b006546e4c6884dfdb4759d9e713`).
- **Tests**: `npm run test:run -- --maxWorkers=2` — 16 files, 103/103 passed
  (Duration 21.75s). Build (`tsc -b && vite build`, 1503 modules transformed;
  pre-existing >500kB chunk-size warning only), typecheck, lint (`eslint .`),
  and FSD (60 modules, 144 dependencies) all exit 0.
- **Delivery**: single PR with `size:exception` — maintainer chose single PR over
  chained; ~781 changed lines (691 new + 90 tracked add/delete) within the 800-line
  session budget, per `apply-progress` and the orchestrator's final-state fact.
- **Edit-authority grant**: the per-change grant for root `/` (maintainer-consented,
  issued to unblock a dispatcher misparse of route path `/capture`) dies with this
  archive. It confers no standing authority beyond this change.
- **Working tree at close**: uncommitted on `feat/captura` (5 modified files +
  new `src/features/capture/` + `src/shared/api/inventory/mock.saveBatch.test.ts`
  + `openspec/` untracked, as in PRs #10–13); source-only PR pending.
  Single-PR revert restores `CapturePlaceholderPage` + unsupported `saveBatch`;
  no migration; mock state in-memory only.
- **Spec counts**: 7 requirements, 13 scenarios (counted `### Requirement:` = 7,
  `#### Scenario:` = 13 in the synced spec). Stale intermediate claims resolved:
  Engram #1715 (spec-write time) says "11 scenarios" and #1717 (tasks-write time)
  says "14 tasks" — both predate the final artifacts and are outranked by the
  persisted `spec.md` (13 scenarios), persisted `tasks.md` (16 items), the
  `verify-report` matrix (7 reqs / 13 scenarios, 16/16 tasks), and the
  orchestrator's explicit final-state facts.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| capture | Created | 7 added, 0 modified, 0 removed; 13 scenarios synced to `openspec/specs/capture/spec.md` |

No main spec existed, so the delta spec was promoted wholesale (mechanical shell copy,
`diff -r` empty — see Mechanical Evidence). No destructive merge; `rules.archive`
("warn before merging destructive deltas") did not trigger. Post-sync check:
`diff -r openspec/specs/capture/spec.md` vs archived delta → identical.

## Archive Contents

- proposal.md ✅
- specs/capture/spec.md ✅
- design.md ✅
- tasks.md ✅ (16/16 complete, 0 unchecked — `grep -c "- [ ]"` = 0)
- apply-progress.md ✅ (intermediate snapshot, retained for audit)
- verify-report.md ✅ (PASS, 0 critical, 0 warnings, 2 cosmetic suggestions)
- archive-report.md ✅ (this file, additive post-move)

Active `openspec/changes/` no longer contains `frontend-capture`.

## Mechanical Evidence (verbatim `diff -r` readbacks)

Spec sync (delta → temp copy before atomic move into place):

```text
DIFF_EMPTY_PASS
```

Post-sync readback (delta vs final `openspec/specs/capture/spec.md`):

```text
POSTSYNC_DIFF_EMPTY_PASS
```

(`diff -r` produced no output, exit 0 in both cases; only then was the temp file
moved to `openspec/specs/capture/spec.md`. Post-archive recheck
`diff -r openspec/specs/capture/spec.md` vs archived delta → identical,
`SYNC_IDENTICAL`.)

Archive move (pre-move recursive snapshot vs archived destination):

```text
ARCHIVE_DIFF_EMPTY_PASS
```

Move mechanics note: `git mv` was attempted first and refused because `openspec/`
is untracked in git (`fatal: directorio de fuente está vacío`);
the contract's plain-`mv` fallback ran after verifying the source was unchanged
against the snapshot (`FALLBACK_SRC_DIFF_EMPTY`), the source was confirmed gone
(`SOURCE_GONE_OK`), and the post-move `diff -r` is empty. No bytes passed
through model Read/Write at any point.

## Traceability

Files read directly: `proposal.md`, `specs/capture/spec.md`, `design.md`,
`tasks.md`, `apply-progress.md`, `verify-report.md` (all under the change folder,
pre-move), plus `openspec/specs/capture/spec.md` and the archived tree post-move.
Engram observations read in full via `mem_get_observation`: #1714
(`sdd/frontend-capture/proposal`), #1715 (`sdd/frontend-capture/spec`), #1716
(`sdd/frontend-capture/design`), #1717 (`sdd/frontend-capture/tasks`), #1718
(`sdd/frontend-capture/verify-report`). `mem_search` for
`frontend-capture apply-progress capture-impl` returned no Engram observation —
`apply-progress` exists as a filesystem artifact only.

## Suggestions Carried (non-blocking, from verify-report)

1. `CaptureTable.tsx` uses `style={{ minWidth: 160 }}` on the state `Select`;
   the frontend-design skill prefers Tailwind (`className="min-w-40"`).
   Cosmetic only, no spec impact.
2. `npm run build` emits the pre-existing >500kB chunk-size warning; unrelated to
   this change but worth tracking for future code-splitting.

## Source of Truth Updated

- `openspec/specs/capture/spec.md` (new — full spec for the capture capability)

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
