# Design: Visual Shell Base

## Technical Approach

Shell-only pass on branch `feat/screens-v2-1b-shell`. Keep AntD `Layout` skeleton in `AppShell.tsx`; fix spacing via `Header`/`Content` style tokens, not new layout libs. Tokens flow `tokens.ts` → `theme.ts` (`ThemeConfig`) → components; no hardcoded brand values. FSD: changes stay in `shared/ui/layout` + `app/` tokens. TDD: RTL first (`npm run test:run`), then Playwright shots at 390/768/1440.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Sticky offset: `position: sticky; top: 0; z-index` on `Header` + `Content` top padding = header height | Fixed header simpler but breaks AntD flow; sticky keeps flow | Sticky header, `Content` gets `paddingTop` token so heading box sits below at 390px |
| Breakpoint `lg` (1024) rail ↔ drawer | `md` earlier drawer wastes desktop space; custom query banned | `Sider breakpoint="lg" collapsedWidth=0`; `Drawer` only `<lg`; rail ≥`lg` |
| Icon rail: `Sider width=80, collapsed` + `Menu inlineCollapsed` | Full sider simpler but violates Datup reference | Narrow rail ≥`lg` with icon+tooltip, active state via `selectedKeys` |
| Active state: `useLocation` → `selectedKeys={[key]}` + `aria-current` on `Link` | `NavLink` idiomatic in react-router but current code uses `Link`+`Menu` | Keep `Link`+`Menu` (preserve Space-key/focus behavior), derive key from pathname, set `aria-current="page"` on active `Link` |
| Drawer polish: `Drawer title + extra close` + nav group headings | Minimal drawer less code but fails spec hierarchy | Header title, grouped `Menu`, labeled close (`t()`), keep `close-on-navigate` + focus return |
| Tokens in `tokens.ts` only | Editing `theme.ts` directly faster but leaks brand values | All values in `tokens.ts`; `theme.ts` only maps |

## Data Flow

`tokens.ts` ──→ `theme.ts (ThemeConfig)` ──→ `AppShell (Header/Sider/Drawer/Content)` ──→ `Outlet` pages. Location ──→ `selectedKeys`/`aria-current`. Drawer: trigger ──→ open ──→ navigate ──→ close ──→ focus return (existing effect untouched).

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/tokens.ts` | Modify | `colorAction #6600FF`, light surfaces, `radiusControl 12`, Manrope-like stack |
| `src/app/theme.ts` | Modify | Map-only (no literals); wire radius/font/surfaces |
| `src/shared/ui/layout/AppShell.tsx` | Modify | Sticky header, rail, `selectedKeys`/`aria-current`, drawer structure, content padding |
| `src/pages/screens.tsx` | Modify | Content top padding vs sticky header only |
| `tests/` shell RTL | Modify | Overlap bbox, active-state, drawer close+focus asserts |

## Interfaces / Contracts

```ts
// tokens.ts additions: colorAction:'#6600FF', radiusControl:12,
// fontFamilyBase:"Manrope,'Segoe UI',Inter,sans-serif", light surfaces
const activeKey = pathnameToKey(useLocation().pathname); // 'warehouses' | ...
<Menu selectedKeys={[activeKey]} ... /> // active Link gets aria-current="page"
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| RTL unit | Heading bbox below header; exactly one `aria-current`; drawer close+focus return; Space-key nav | `npm run test:run`, jsdom bbox mocks |
| Visual | 390/768/1440 shots, no overlap/overflow | Playwright shots, orchestrator-style review |
| Regression | 1b asserts green | Snapshot update same work unit if tokens shift |

## Threat Matrix

N/A — no routing lib change, shell, subprocess, VCS/PR automation, or executable classification. `useLocation` read-only.

## Migration / Rollout

No migration. Rollback = revert shell hunks (`AppShell`, `tokens`, `theme`, `screens.tsx`, shell RTL) on same branch; PR 1a untouched; single PR ≤800 authored lines.
