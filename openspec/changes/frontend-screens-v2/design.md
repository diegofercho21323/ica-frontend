# Design: Frontend Screens v2 — PR 1b-shell remediation

## Technical Approach

Remediate verify FAIL (#1592, 0/4 scenarios compliant) with shell-only hunks on `feat/screens-v2-1b-shell`. Keep the RED RTL tests already in the tree (`tests/app.smoke.test.tsx`), then make them GREEN: close the mobile `Drawer` on nav-link activation and restore focus to the menu trigger, keeping exact `t()` copy and desktop `Sider` untouched. Strict TDD (`npm run test:run`); slice ≤400 authored lines; PR 1a files untouched.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Close drawer via AntD `Menu.onClick={close}` (current) vs per-`Link onClick` | Menu-level is one hunk but relies on Menu synthesizing click on keyboard activation | Keep Menu-level close; RED test proves Enter/Space actually close it, else fall back to per-Link `onClick` |
| Focus restore via trigger `ref` + `Drawer.afterOpenChange`/`onClose` effect vs no restore | Extra ref/effect code; required by spec (focus returns to trigger) | Add `triggerRef` on menu `Button`; `useEffect` on `open` false → `triggerRef.current?.focus()` guarded by prior-open flag |
| Desktop `Sider` shares `navigation()` builder with `onNavigate` undefined | Shared builder risks coupling drawer state into desktop | Keep shared builder; desktop call passes no callback so no state change (covered by desktop scenario) |
| Copy via existing `t('app.emptyWarehouses')` / `t('app.capturePlaceholder')` in `screens.tsx` | No change needed; tests assert exact strings | No copy change; GREEN only wires behavior, not strings |
| `createBrowserRouter` + real `<Link>` (current) vs `MemoryRouter` in tests | Real router proves observed transition; tests already render `<App/>` directly | Keep real router; assert URL/heading change, never `href` alone |

## Data Flow

Link activation → router transition → drawer close → focus restore:

    Nav Link (click/Enter/Space)
      ──→ react-router transition (Outlet swaps page)
      ──→ Menu onClick → setOpen(false)
      ──→ Drawer onClose / open=false
      ──→ effect → triggerRef.focus()
      ──→ assert: heading + exact alert copy visible, dialog gone

Desktop path skips the middle three steps (`navigation()` without callback; `Sider` has no open state).

## File Changes

| File | Action | Description |
|---|---|---|
| `src/shared/ui/layout/AppShell.tsx` | Modify | Add trigger ref + focus-restore effect; keep Menu-level close; desktop Sider unchanged |
| `src/pages/screens.tsx`, `src/app/i18n/es.json` | Unchanged | Exact copy already via `t()`; no edit |
| `src/app/router.tsx`, `src/app/theme.ts`, `src/app/providers.tsx` | Unchanged | Router/ThemeConfig already compliant |
| `tests/app.smoke.test.tsx` | Modified (RED already in tree) | Keyboard/link activation, observed transition, exact-copy asserts, drawer close + focus, both breakpoints |
| `src/tests/**` | Untouched | Forbidden by session contract |

## Interfaces / Contracts

No new public API. Internal contract only: `navigation(onNavigate?: () => void)` — drawer passes `() => setOpen(false)`, Sider passes nothing. Focus restore reads `triggerRef` (menu `Button`) and runs only on open→closed transition to avoid stealing focus on first render.

Non-obvious pattern — guarded restore effect:

```tsx
const triggerRef = useRef<HTMLButtonElement>(null)
const wasOpen = useRef(false)
// on open change: if (open) wasOpen.current = true
// else if (wasOpen.current) { wasOpen.current = false; triggerRef.current?.focus() }
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (RTL RED first) | Enter/Space/click on each nav link → observed heading + URL change | Existing `app.smoke.test.tsx` test 1; must FAIL before GREEN, then pass |
| Integration (RTL) | Drawer open → keyboard-activate link → route changes, dialog closes, focus returns to trigger; exact `emptyWarehouses`/`capturePlaceholder` text | Existing test 2 + focus assertion to add; `waitFor` dialog removal |
| Breakpoints | Desktop (≥lg): link activation transitions with no drawer state change | RTL with lg viewport (match existing Sider coverage); Sider has no `open` state by construction |
| Gates | `test:run`, typecheck, lint, fsd, format:check, build exit 0; slice ≤400 lines | Run full gate suite; `git diff --stat` for budget |

## Threat Matrix

N/A — no routing-policy change (same five routes), no shell commands, subprocesses, VCS/PR automation, executable-file classification, or process integration. Pure client UI state (drawer open/focus) + RTL assertions.

## Migration / Rollout

No migration. Rollback = revert shell-only hunks (`AppShell.tsx` + smoke test) on `feat/screens-v2-1b-shell`; 12-shell-path boundary from proposal. PR 1a untouched. Single-PR delivery; work-unit commits: (1) RED tests, (2) GREEN drawer+focus, (3) gate evidence — no commit/push per session contract (uncommitted tree only).

## Open Questions

- None blocking. Watch item: if AntD `Menu.onClick` does not fire on Space activation in CI, fall back to per-`Link onClick={close}` (one-line change, same rollback boundary).
