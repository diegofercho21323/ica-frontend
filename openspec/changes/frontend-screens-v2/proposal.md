# Proposal: Frontend Screens v2

## Intent

Deliver the operator-facing v2 screens (blind sequential capture + Oracle sync) as navigable mock-backed flows. The app renders one static shell at `/` today. Verify FAIL on PR 1b-shell (0/4 scenarios fully compliant) gates the chain: interaction-level shell remediation first, then access, then MVP slices.

## Scope

### In Scope
- PR 1b-shell remediation: keyboard/link navigation proof, exact localized placeholders (`emptyWarehouses`, `capturePlaceholder`), mobile drawer close on navigation
- PR 1c-access (deferred, base: remediated 1b): mock login/session/guards, Playwright Login → Dashboard
- Mock-first MVP chain 1d–3b; HTTP parity as PR 4 after MVP acceptance

### Out of Scope
- Real HTTP/Oracle integration; PWA/offline; brand asset validation
- Captura core beyond placeholder; voice/OCR overlays (demo-gated, post-core)
- Any `demo-admin` UI entry point; a fifth count state (`Omitir` stays `NOT_COUNTED`)

## Capabilities

### New Capabilities
- `app-shell`: v2 tokens/theme, AppShell landmarks, responsive drawer/nav, `t()` strings
- `public-routes`: Login/Dashboard/Bodegas/Capture placeholder topology + localized placeholders
- `mock-access`: mock credentials, session persistence, route guards (deferred to 1c)

### Modified Capabilities
- None — `openspec/specs/` has no baseline specs

## Approach

Strict TDD (`npm run test:run`), stacked-to-main slices ≤400 authored lines. Remediate 1b with interaction-level RTL (link/keyboard activation, observed transition, drawer close, exact-copy asserts) on `feat/screens-v2-1b-shell`. PR 1a guards stay untouched. FSD layers via dependency-cruiser; AntD ThemeConfig, no Tailwind; text decimal inputs only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/ui/layout/AppShell.tsx` | Modified | Close mobile drawer on link activation |
| `src/pages/screens.tsx`, `src/app/i18n/es.json` | Modified | Exact localized placeholders |
| `tests/app.smoke.test.tsx` | Modified | Interaction-level RTL proof |
| `src/features/access/` | New (1c) | Mock login/session/guards |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Remediation exceeds 400-line budget | Low | Shell-only hunks; access stays in 1c |
| Drawer fix breaks desktop nav | Low | RTL covers both breakpoints |
| Scope creep into HTTP work | Med | PR 4 gate after MVP acceptance |

## Rollback Plan

Remediation reverts shell-only hunks on `feat/screens-v2-1b-shell`; 1b rollback boundary is the 12 shell paths. Full change: revert the stacked PR; shell plus mock contracts stay green.

## Dependencies

- Engram history is source of truth: `sdd/frontend-screens-v2/proposal|tasks|apply-progress|verify-report`
- `.git/ica-design/screens-v2.md` is visual-only; `docs/PRD.md` wins on contract

## Success Criteria

- [ ] 4/4 route scenarios fully runtime-proven (keyboard/link, exact copy, drawer close)
- [ ] `test:run`, typecheck, lint, fsd, format:check, build all exit 0
- [ ] PR 1a files untouched; slice ≤400 authored lines
