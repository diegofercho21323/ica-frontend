import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { theme } from '../src/app/theme'
import { tokens } from '../src/app/tokens'

const SHELL_SOURCES = [
  'src/shared/ui/layout/AppShell.tsx',
  'src/pages/screens.tsx',
  'src/app/theme.ts',
  'src/app/providers.tsx',
]
const HEX = /#[0-9A-Fa-f]{3,8}\b/g
// colorActionInk is reserved for future ink-on-action use; AntD seed tokens
// have no slot for it, so exhaustion exempts it by name.
const RESERVED_TOKENS: readonly string[] = ['colorActionInk']

describe('theme tokens derive from tokens.ts', () => {
  it('maps AntD seed tokens to the shared tokens', () => {
    const seed = theme.token ?? {}
    expect(seed.colorPrimary).toBe(tokens.colorAction)
    expect(seed.colorBgBase).toBe(tokens.colorSurfaceSunken)
    expect(seed.colorBgContainer).toBe(tokens.colorSurface)
    expect(seed.colorTextBase).toBe(tokens.colorTextStrong)
    expect(seed.colorBorder).toBe(tokens.colorBorderSubtle)
    expect(seed.colorSuccess).toBe(tokens.colorConfirm)
    expect(seed.colorWarning).toBe(tokens.colorAttention)
    expect(seed.colorError).toBe(tokens.colorCritical)
    expect(seed.borderRadius).toBe(tokens.radiusControl)
    expect(seed.fontFamily).toBe(tokens.fontFamilyBase)
  })

  it('consumes every non-reserved token and keeps brand hex out of shell sources', () => {
    const consumed = new Set<unknown>(Object.values(theme.token ?? {}))
    for (const [name, value] of Object.entries(tokens)) {
      if (RESERVED_TOKENS.includes(name)) continue
      expect(
        consumed.has(value),
        `${name} is not consumed by ThemeConfig`,
      ).toBe(true)
    }
    expect(SHELL_SOURCES.length).toBeGreaterThan(0)
    for (const file of SHELL_SOURCES) {
      const source = readFileSync(file, 'utf8')
      expect(source.match(HEX) ?? [], `${file} hardcodes a brand hex`).toEqual(
        [],
      )
    }
    expect(readFileSync('src/app/theme.ts', 'utf8')).toContain('tokens.')
    // Guard the guard: the scanner must find hex where hex exists.
    expect(
      readFileSync('src/app/tokens.ts', 'utf8').match(HEX)?.length ?? 0,
    ).toBeGreaterThan(0)
  })
})
