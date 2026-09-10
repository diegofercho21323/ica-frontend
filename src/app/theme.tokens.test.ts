import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { theme } from './theme'
import { tokens } from './tokens'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')

/**
 * Confirmed Tallycore brand token values (visual-shell spec, GAP-1 resolved).
 * `colorSuccess` / `colorWarning` carry a minimal AA nudge away from the raw
 * spec hex so white-on-surface text clears 4.5:1 — see theme/contrast-table.md.
 */
const SPEC = {
  colorPrimary: '#0B5CD6',
  colorBgLayout: '#F4F6F9',
  colorBgContainer: '#FFFFFF',
  colorText: '#1A2332',
  colorTextSecondary: '#5A6B82',
  colorBorder: '#D9E0EA',
  colorSuccess: '#1C8449', // spec #1F8A4C nudged for AA (white text 4.5:1)
  colorWarning: '#A86400', // spec #B26A00 nudged for AA (white text 4.5:1)
  colorError: '#C0392B',
  borderRadius: 6,
} as const

const FONT_FAMILY =
  "Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const FONT_SCALE = [12, 14, 16, 20, 24, 30] as const

/** WCAG 2.x relative luminance + contrast ratio (W3C G17/G18 math). */
function luminance(hex: string): number {
  const c = hex.replace('#', '')
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const [r, g, b] = [0, 2, 4].map((i) =>
    channel(parseInt(c.slice(i, i + 2), 16)),
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#FFFFFF'

/** Recursively collect .ts/.tsx sources under a dir, minus tests + theme module. */
function collectSources(rel: string): string[] {
  const abs = join(repoRoot, rel)
  const out: string[] = []
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const childRel = join(rel, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectSources(childRel))
      continue
    }
    if (!/\.tsx?$/.test(entry.name)) continue
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue
    // The theme module is the ONLY place brand literals are allowed.
    if (
      childRel === join('src', 'app', 'tokens.ts') ||
      childRel === join('src', 'app', 'theme.ts') ||
      childRel.startsWith(join('src', 'app', 'theme') + '/')
    ) {
      continue
    }
    out.push(childRel)
  }
  return out
}

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/
const FONT_LITERAL_RE = /font-family|fontFamily|Manrope|['"]Inter['"]/i
const PX_RADIUS_RE = /border-?radius\s*:\s*['"]?\d/i

describe('Tallycore theme tokens (F3-PR1)', () => {
  it('exposes every confirmed Tallycore value on tokens.ts', () => {
    for (const [key, value] of Object.entries(SPEC)) {
      expect(tokens[key as keyof typeof tokens]).toBe(value)
    }
    expect(tokens.fontFamily).toBe(FONT_FAMILY)
    expect(tokens.fontSize).toBe(14)
  })

  it('resolves every semantic token through the AntD ConfigProvider theme', () => {
    const token = theme.token ?? {}
    expect(token.colorPrimary).toBe(SPEC.colorPrimary)
    expect(token.colorBgLayout).toBe(SPEC.colorBgLayout)
    expect(token.colorBgContainer).toBe(SPEC.colorBgContainer)
    expect(token.colorText).toBe(SPEC.colorText)
    expect(token.colorTextSecondary).toBe(SPEC.colorTextSecondary)
    expect(token.colorBorder).toBe(SPEC.colorBorder)
    expect(token.colorSuccess).toBe(SPEC.colorSuccess)
    expect(token.colorWarning).toBe(SPEC.colorWarning)
    expect(token.colorError).toBe(SPEC.colorError)
    expect(token.borderRadius).toBe(SPEC.borderRadius)
    expect(token.fontFamily).toBe(FONT_FAMILY)
    expect(token.fontSize).toBe(14)
  })

  it('keeps the Layout component tokens derived from semantic surfaces', () => {
    const layout = theme.components?.Layout ?? {}
    expect(layout.bodyBg).toBe(SPEC.colorBgLayout)
    expect(layout.headerBg).toBe(SPEC.colorBgContainer)
    expect(layout.siderBg).toBe(SPEC.colorBgContainer)
    expect(layout.headerColor).toBe(SPEC.colorText)
  })

  it('pins the exact system font-family stack with an Inter fallback', () => {
    expect(FONT_FAMILY.startsWith('Inter,')).toBe(true)
    expect(FONT_FAMILY.endsWith('sans-serif')).toBe(true)
    expect(String(theme.token?.fontFamily)).toBe(FONT_FAMILY)
  })

  it('exposes the confirmed modular font scale', () => {
    expect(theme.token?.fontSize).toBe(FONT_SCALE[1])
    // scale is strictly ascending 12 -> 30
    for (let i = 1; i < FONT_SCALE.length; i += 1) {
      expect(FONT_SCALE[i]).toBeGreaterThan(FONT_SCALE[i - 1])
    }
  })

  it.each([
    ['text on surface', SPEC.colorText, SPEC.colorBgContainer],
    ['text on layout', SPEC.colorText, SPEC.colorBgLayout],
    ['text-secondary on surface', SPEC.colorTextSecondary, SPEC.colorBgContainer],
    ['text-secondary on layout', SPEC.colorTextSecondary, SPEC.colorBgLayout],
    ['white on primary', WHITE, SPEC.colorPrimary],
    ['white on success', WHITE, SPEC.colorSuccess],
    ['white on warning', WHITE, SPEC.colorWarning],
    ['white on error', WHITE, SPEC.colorError],
  ])('WCAG 2.2 AA (>=4.5:1): %s', (_label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('contains zero hardcoded brand literals under src/app and src/features', () => {
    const sources = [
      ...collectSources('src/app'),
      ...collectSources('src/features'),
    ]
    // Guard the guard: the walker must actually find real source files.
    expect(sources.length).toBeGreaterThan(10)

    const offenders: string[] = []
    for (const rel of sources) {
      const body = readFileSync(join(repoRoot, rel), 'utf8')
      if (
        HEX_RE.test(body) ||
        FONT_LITERAL_RE.test(body) ||
        PX_RADIUS_RE.test(body)
      ) {
        offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])

    // Guard the guard: the same scan must flag the theme module, which is the
    // one place brand literals legitimately live.
    const themeBody = readFileSync(
      join(repoRoot, 'src/app/tokens.ts'),
      'utf8',
    )
    expect(HEX_RE.test(themeBody)).toBe(true)
    expect(relative(repoRoot, join(repoRoot, 'src/app/tokens.ts'))).toBe(
      'src/app/tokens.ts',
    )
  })
})
