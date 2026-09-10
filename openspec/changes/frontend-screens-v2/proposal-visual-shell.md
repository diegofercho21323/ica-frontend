# Proposal Amendment: Visual Shell Base (frontend-screens-v2)

Amends `proposal.md`. Shell-first visual overhaul; dashboard KPI wow comes later.

## Intent

Fix proven mobile bug at 390px (header overlaps page heading; bare-list drawer) and align shell with Datup SaaS reference (light theme, violet `#6600FF`, icon rail, whitespace, ~12px radius, Manrope-like font).

## Scope

### In Scope
- Mobile-first responsive shell: zero overlap at 390px (sticky header offset, safe content padding)
- Light Datup-inspired theme via existing `ThemeConfig`/`tokens.ts` pipeline (accent, surfaces, radius, font)
- Sidebar: narrow icon rail on desktop with visible active-route state (`NavLink`/`selectedKeys`, `aria-current`)
- Clean header: breadcrumb + title, no overlap; responsive drawer with header, nav hierarchy, focus return
- RTL coverage: overlap regression, active state, drawer close on navigation

### Out of Scope
- KPI card content, charts, dashboard wow pass
- 1c-access (login/session/guards), backend/Oracle, PWA/offline

## Capabilities

### New Capabilities
- `visual-shell`: responsive Datup-inspired shell theme + active nav states

### Modified Capabilities
- `app-shell`: layout/overlap/drawer behavior and token values change

## Approach

Shell-only hunks on `feat/screens-v2-1b-shell`: retune `tokens.ts` + `theme.ts`, restructure `AppShell.tsx` (Header/Sider/Drawer/Content spacing, `lg` breakpoint, icon rail), keep FSD (`shared/ui/layout`), AntD ThemeConfig, `t()` strings, no Tailwind.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/ui/layout/AppShell.tsx` | Modified | Header offset, icon rail, active states, drawer polish |
| `src/app/tokens.ts`, `src/app/theme.ts` | Modified | Light palette, violet accent, radius, font |
| `src/pages/screens.tsx` | Modified | Content padding vs sticky header only |
| `tests/` RTL | Modified | Overlap + active-state + drawer asserts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Token retune breaks 1b asserts | Med | Update snapshots same PR; shell-only diff |
| Desktop rail regressions | Low | RTL desktop + Playwright 1440 shot |

## Rollback Plan

Revert shell-only hunks on `feat/screens-v2-1b-shell`; token + AppShell + tests restore prior green 1b. No access/backend touched.

## Success Criteria

- [ ] Screenshots at 390/768/1440 reviewed, no header/content overlap
- [ ] Active-route state visible on sidebar and drawer, keyboard-navigable
- [ ] RTL shell suite green; single PR ≤800 authored lines
