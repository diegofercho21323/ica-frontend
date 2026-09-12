import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UnitBadge } from './UnitBadge'

const here = dirname(fileURLToPath(import.meta.url))

describe('UnitBadge primitive (F3-PR3)', () => {
  it('renders the exact ERP unit verbatim, untranslated', () => {
    render(<UnitBadge unit="KG" />)
    expect(screen.getByText('KG')).toBeInTheDocument()
  })

  it('shows an optional translated label alongside the exact unit', () => {
    render(<UnitBadge unit="UN" label="Unidad" />)
    expect(screen.getByText('Unidad')).toBeInTheDocument()
    expect(screen.getByText('UN')).toBeInTheDocument()
  })

  it('renders the unit alone with no leaked placeholder when no label is given', () => {
    render(<UnitBadge unit="LT" />)
    expect(screen.getByText('LT')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
  })

  it('exposes no interactive role — a read-only identifier, never a control', () => {
    render(<UnitBadge unit="KG" label="Unidad" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('carries no hardcoded brand hex, font-family, or radius literal in the component source', () => {
    const source = readFileSync(join(here, 'UnitBadge.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/font-family|fontFamily|Manrope|['"]Inter['"]/i)
    expect(source).not.toMatch(/border-?radius\s*[:=]\s*['"]?\d/i)
  })
})
