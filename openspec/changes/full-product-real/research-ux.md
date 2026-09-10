# Research: UX Multi-Tenant + Design System + Offline/PWA — full-product-real

> Status: `done` | Lane: UX multi-tenant + design system + offline/PWA | Change: `full-product-real` | Revision: `1`

This lane is evidence-ready for `propose`. External sources validate the Ant Design 5 token mechanism, WCAG 2.2 AA targets, TanStack Query optimistic/offline mutation pattern, i18next locale-additive structure, and Vite PWA + IndexedDB outbox pattern. No Colsubsidio hex, logo, font, or asset is invented here; exact brand values remain a gap pending official validation (PRD §16, §23).

## Quick path

1. Theme via Ant Design 5 `ConfigProvider theme.token` (seed) + `theme.components` (component tokens): semantic layer only, no hardcoded hex.
2. Build the 12 primitives in `src/shared/ui/primitives/` with no business logic; shell collapses sidebar to drawer below `lg`.
3. Guided one-line assistant + manual mode, keyboard-first shortcuts, live-region announcements, and an explicit queue (`synced` / `pending` / `conflict`) that never auto-resolves `409` and never edits server-locked attempts.

## Questions

| # | Question | Outcome |
|---|----------|---------|
| Q1 | How are Ant Design 5 semantic tokens customized without inventing brand values? | Supported (S1, S2) |
| Q2 | Which WCAG 2.2 AA criteria govern contrast, keyboard, focus, target size, and live announcements? | Supported (S5) |
| Q3 | What is the TanStack Query pattern for optimistic capture + retry + offline-ordered replay? | Supported (S3) |
| Q4 | What is the Vite PWA + IndexedDB pattern for installable shell + local outbox? | Supported (S6) |
| Q5 | How is i18next structured so `es` is complete and new locales are additive? | Supported (S4) |
| Q6 | What does each of the 12 primitives + responsive shell + guided/manual + blind-safety mean for this repo? | Supported (S1–S7, repo mapping below) |

## Admission

- Requested classes: `documentation` (AntD 5 tokens, TanStack Query, i18next), `open-web` (WCAG 2.2 AA, Vite PWA / idb-keyval patterns).
- Capability: `gentle-ai.sdd-research-capability/v1` admitted with exact grants `documentation` + `open-web`.
- Denial: none. No inference from tool names, filenames, or inherited access. All claims below map to listed sources.

## Sources

| ID | Class | Title | Publisher | URL | Accessed |
|----|-------|-------|-----------|-----|----------|
| S1 | documentation | Customize Theme — Design Token (Seed/Map/Alias) + global token override | Ant Design docs via Context7 `/websites/ant_design` | https://ant.design/docs/react/customize-theme.md | 2026-09-09 |
| S2 | documentation | ConfigProvider theme + per-component tokens + `algorithm` flag | Ant Design docs via Context7 `/websites/ant_design` | https://ant.design/components/config-provider.md | 2026-09-09 |
| S3 | documentation | Mutations: `retry`, offline-ordered replay, `onMutate` optimistic update + `onError` rollback + `onSettled` invalidate | TanStack Query docs via Context7 `/tanstack/query` | https://github.com/TanStack/query (guides/mutations, optimistic-updates) | 2026-09-09 |
| S4 | documentation | `i18next.init` — `lng`, `fallbackLng`, `ns`/`defaultNS`/`fallbackNS`, `supportedLngs`, `addResourceBundle` | i18next docs via Context7 `/i18next/i18next` | https://github.com/i18next/i18next (configuration, i18n-instance API) | 2026-09-09 |
| S5 | open-web | WCAG 2.2 Recommendation + Understanding (Focus Visible 2.4.7, Focus Not Obscured 2.4.11, Target Size Minimum 2.5.8, ARIA live techniques) + Quick Reference | W3C WAI | https://www.w3.org/TR/WCAG22, https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html, https://www.w3.org/WAI/WCAG22/Techniques, https://www.w3.org/WAI/WCAG22/quickref | 2026-09-09 |
| S6 | open-web | vite-plugin-pwa (`generateSW` vs `injectManifest`, `registerSW`, precache app shell) + idb-keyval promise keyval API + offline "queue and sync" outbox pattern | vite-plugin-pwa / Workbox / jakearchibald / community guide | https://github.com/vite-pwa/vite-plugin-pwa/blob/main/docs/workbox/index.md, https://github.com/jakearchibald/idb-keyval, https://medium.com/@Christopher_Tseng/build-a-blazing-fast-offline-first-pwa-with-vue-3-and-vite-in-2025-the-definitive-guide-5b4969bc7f96 | 2026-09-09 |
| S7 | documentation | Repo state: `package.json` deps + `explore.md` + PRD §§11/14/16/19 (observed, not an external authority) | ica-frontend repo | `package.json`, `openspec/changes/full-product-real/explore.md`, `docs/PRD.md` | 2026-09-09 |

Excerpts (short, verbatim-in-spirit):

- S1: "The Design Token system uses a three-layer derivation structure consisting of Seed Tokens, Map Tokens, and Alias Tokens." Override via `ConfigProvider theme.token` (e.g. `colorPrimary`, `borderRadius`, `colorBgContainer`).
- S2: Override per component via `theme.components: { Button: { colorPrimary, algorithm: true } }`; `algorithm: true` enables derivative calculation.
- S3: "TanStack Query will not retry a mutation on error" by default; with `retry` set, "if mutations fail because the device is offline, they will be retried in the same order when the device reconnects." Optimistic pattern: `onMutate` cancels queries, snapshots previous data, `setQueryData`, returns context; `onError` rolls back; `onSettled` invalidates.
- S4: `init({ lng, fallbackLng, ns, defaultNS, fallbackNS, supportedLngs, preload, backend.loadPath: '/locales/{{lng}}/{{ns}}.json' })`; `addResourceBundle(lng, ns, resources, deep, overwrite)` merges a new locale additively.
- S5: WCAG 2.2 is a W3C Recommendation (2023-10-05). AA-relevant: 1.4.3 contrast 4.5:1 (G18), 1.4.11 non-text contrast, 2.1.1 keyboard, 2.4.7 focus visible, 2.4.11 focus not obscured (minimum, AA), 2.5.8 target size minimum 24×24 CSS px (AA), 4.1.3 status messages via `role=status` (ARIA22) / `role=alert` (ARIA19) / progress via live region (ARIA25).
- S6: `VitePWA()` generates a Workbox service worker + manifest; `registerSW({ onNeedRefresh, onOfflineReady })` drives prompt/autoUpdate; `generateSW` precaches the app shell, `injectManifest` is for custom SW logic (e.g. API runtime caching); `idb-keyval` exposes promise-based `get/set/update/keys/entries`; offline-mutation pattern: store form payload to an IndexedDB "outbox" as `pending`, sync on reconnect.
- S7: Repo already pins `antd 5.29.3`, `@tanstack/react-query 5.101.4`, `i18next 26.3.6`, `idb-keyval ^6.2.2`; `vite-plugin-pwa` is NOT in `package.json`; primitives dir contains only `HomeShell.tsx` + `KpiCard.tsx`; PRD requires blind capture, exact-string quantities, `409`-no-autoresolve, and demo queue labels.

## Validated claims

| # | Claim | Sources |
|---|-------|---------|
| C1 | AntD 5 theming is a three-layer token system (Seed → Map → Alias); global customization goes through `ConfigProvider theme.token`, per-component through `theme.components` with optional `algorithm: true`. | S1, S2 |
| C2 | WCAG 2.2 AA requires (among others): text contrast ≥ 4.5:1, visible keyboard focus that is not obscured, pointer targets ≥ 24×24 CSS px (or qualifying spacing/equivalent), full keyboard operability, and status/error/progress announcement via live regions (`role=status`/`alert`/progress live region). | S5 |
| C3 | 2.4.13 Focus Appearance (2px perimeter, 3:1) is Level AAA, NOT AA — AA conformance must not cite it as required. | S5 |
| C4 | TanStack Query mutations do not retry by default; with `retry` set, offline-failed mutations replay in order on reconnect; the auditable optimistic pattern is `onMutate` (cancel + snapshot + `setQueryData` + return context) → `onError` (rollback from context) → `onSettled` (invalidate). | S3 |
| C5 | TanStack Query provides no built-in IndexedDB persistence or cross-reload outbox; a durable offline queue must be built explicitly (e.g. IndexedDB record of attempt + body + idempotency key) outside the Query cache. | S3, S6 |
| C6 | `vite-plugin-pwa` with Workbox precaches the app shell + manifest; `generateSW` covers static-asset offline, `injectManifest` is the path for custom runtime/API caching; `registerSW` lifecycle (`onNeedRefresh` / `onOfflineReady`) drives the update prompt. | S6 |
| C7 | `idb-keyval` is a promise-based IndexedDB keyval store (`get/set/update/keys/values/entries`); it is suitable for a versioned outbox (`attempt + body + key`), not for indexed/complex queries (use heavier `idb` if indexing is needed). | S6 |
| C8 | i18next locale-additive structure: `lng` + `fallbackLng` + `ns`/`defaultNS` (+ optional `fallbackNS`) + `supportedLngs`/`preload` + per-locale JSON (`/locales/{{lng}}/{{ns}}.json`); new locales merge via `addResourceBundle` without touching existing bundles. | S4 |
| C9 | `vite-plugin-pwa` is not yet a repo dependency; the PWA shell claim is externally validated but locally unimplemented (gap, not contradiction). | S6, S7 |
| C10 | PRD quantity exactness (decimal-as-string, max 6 decimals, no float coercion) and idempotency-key-per-operation are product-contract constraints consistent with — but not stated by — the external sources; they are carried as repo requirements, not external claims. | S7 |

## What this means for this repo

### Design tokens (no invented hex)

| Topic | Resolution |
|-------|------------|
| Mechanism | `ConfigProvider theme.token` for seed/global tokens, `theme.components` for per-component tokens (C1). |
| Semantic set | `action primary`, `background`, `surface`, `text`, `focus`, `success`, `warning`, `error` — names only, values unresolved. |
| Brand rule | Do NOT invent Colsubsidio hex/logo/font values. Wire the token plumbing with placeholder-free semantic names and leave values to brand validation (PRD §16, §23). |
| Contrast proof | Every token pair must later prove WCAG AA contrast (C2); token PR must include contrast table, not just swatches. |

### Primitives (`src/shared/ui/primitives/`, no business logic)

| Primitive | Evidence-backed shape |
|-----------|----------------------|
| Button | AntD Button themed via `theme.components.Button` (C1); target ≥ 24×24 px, visible focus (C2). |
| NumericInput | Exact-decimal-string editing (S7); display formatting is locale-side only, never coercing the contract string (C10, C8). |
| SearchInput | Keyboard-first trigger `Ctrl+K` (S7 PRD §11); results navigable by arrows, `Esc` closes (PRD §11). |
| Modal / Drawer | Focus trap + restore, `Esc` close, labelled dialog (C2, S5 techniques H102/G21). |
| Status | Text + icon, never color-only (C2: 1.4.1-equivalent non-color encoding, PRD §14/§19). |
| Progress | Live-region-backed progress announcement (C2 ARIA25). |
| Table | AntD Table primitive; small screens → card fallback or safe horizontal scroll (S7 PRD §14). |
| ItemCard | One-line-assistant card: name + full ERP unit + state + primary action always visible (S7 PRD §7 recognition-over-memory). |
| UnitBadge | Unit is read-only, exact, untranslated identifier; only its label is localizable (S7 PRD §14). |
| ScannerTrigger | Barcode search-then-manual-add with explicit name + unit (S7 PRD §§11–12). |
| LiveRegion | `role=status`/`alert` announcer for save/submit/retry/conflict; loading containers use `aria-busy` (C2, S7 PRD §14). |

Current state: only `HomeShell.tsx` + `KpiCard.tsx` exist — the remaining 11 primitives are greenfield (S7).

### Responsive shell

Sidebar on `≥ lg`, drawer nav below `lg` (Tailwind `lg:` breakpoint per frontend-design skill); tablet portrait/landscape are primary targets with large touch controls; focused element must never be obscured by sticky content (C2: 2.4.11).

### Guided assistant + manual + keyboard-first

- Guided: one `ItemCard` at a time, save auto-advances, history stays editable until finalize (S7 PRD §§7–8, 12).
- Manual: starts empty; scan / `Ctrl+K` search / progressive add; on-demand pending-identity lookup reveals identities + units only, never values (S7 PRD §8).
- Keys: `Enter` save/continue, `Ctrl+K` search, arrows prev/next, `Esc` close dialog; must not hijack assistive-tech or in-field editing (S7 PRD §11) and every action must have a pointer/single-tap equivalent where dragging is involved (C2: 2.5.7).

### Queue + conflict (no auto-resolve)

Local outbox record = `{ attempt_id, body, Idempotency-Key }` in versioned `idb-keyval` keys (C5, C7). Visible states: `synced` / `pending` / `conflict` (PRD §19). `409` (locked attempt or same-key-different-body) blocks automatic retry and requires deliberate recovery (S7 App. A, C10). Never edit an attempt the server reports locked. Multi-user reconciliation stays an explicit non-goal (S7 PRD §22).

### Blind-safety

No theoretical stock, delta/variance, prior counts, or compatibility/ranking surfaces in dashboard, progress, queue, or history (S7 PRD §§4, 17). Progress shows counted-vs-pending counts only. Needs failing tests against forbidden fields, not review alone (explore.md risk).

### i18n

All UI strings via `t()`; `es` complete first; technical units and API state identifiers untranslated, labels translated; quantity edit-exact vs display-formatted (table above); new locale = new bundle merged additively (C8).

## Contradictions, uncertainty, freshness

- Contradiction checked, none blocking: community summaries sometimes label Focus Appearance as AA — normative W3C source confirms 2.4.13 is AAA; this research cites only AA criteria as required (C3).
- Uncertainty: exact Colsubsidio palette/typography/assets unknown — recorded as GAP-1, not invented.
- Uncertainty: PWA plugin version/fs layout for this repo undecided — propose phase pins it; current evidence validates the pattern only (C9).
- Uncertainty: server `payload_hash` display policy (full/abbreviated/support-only) undecided per PRD §23 — GAP-2.
- Freshness: WCAG 2.2 REC 2023-10-05, current as of 2026-09-09; AntD 5 token model and TanStack Query v5 mutation semantics match pinned repo majors (5.29.3 / 5.101.4); `vite-plugin-pwa`/`idb-keyval` APIs per 2025-era docs, compatible with installed `idb-keyval ^6.2.2`.

## Gaps (not invented)

- GAP-1: Colsubsidio official hex/type/logo/assets (PRD §23) — blocks theme-value closure, not token plumbing.
- GAP-2: `payload_hash` display policy (PRD §23).
- GAP-3: Secure token/offline-data storage, expiry, and wipe policy before production (PRD §§14, 23).
- GAP-4: `session_id` end-to-end linkage + read endpoints (assignments/versions/receipts) — UX must stay mock-backed until contract lands (PRD §§5, 23).

## Product choices (non-authoritative, orchestrator-confirmed)

These are NOT research findings and carry no evidence weight: `delivery=chained-prs` (single-pr rejected by budget), `backend=hybrid` (config-swappable mock + progressive HTTP), `scope=multi-tenant` (company → scopes → snapshots, `session_id` end to end). Owned by the orchestrator; recorded here only for traceability.

## Details

| Topic | Decision |
|-------|----------|
| Scope | This research covers the UX lane only; no proposal, spec, design, or tasks created. |
| Language | Artifact in English per lane contract. |
| Stores | Hybrid: `openspec/changes/full-product-real/research-ux.md` + Engram `sdd/full-product-real/research-ux`, identical bytes, revision `1`. |
| Readiness | `done`: exact grants, complete mapped sources, no unvalidated claims. |

## Checklist

- [ ] Reader can name the AntD 5 token layers and where each override lives.
- [ ] Reader can list the AA criteria this lane must satisfy without citing AAA as required.
- [ ] Reader can describe the optimistic-mutation + ordered-replay + explicit-outbox pattern.
- [ ] Reader can explain why `409` never auto-resolves and locked attempts are never edited offline.
- [ ] Reader can state the two gaps that block theme/receipt closure (GAP-1, GAP-2).

## Next step

Run `propose` for `full-product-real` with this evidence referenced and confirmed decisions carried in the handoff. Do not jump to spec/design/tasks.

---
<!-- gentle-ai:sdd-research/v1 revision=1 outcome=done -->
<!-- evidence-refs: S1 ant.design/docs/react/customize-theme.md, S2 ant.design/components/config-provider.md, S3 tanstack/query mutations+optimistic-updates, S4 i18next configuration+i18n-instance, S5 w3.org/TR/WCAG22 + WAI Understanding/Techniques/QuickRef, S6 vite-plugin-pwa/idb-keyval/offline-outbox, S7 repo package.json+explore.md+PRD -->
