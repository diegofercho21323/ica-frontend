import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LiveRegion } from './LiveRegion'

const here = dirname(fileURLToPath(import.meta.url))

describe('LiveRegion primitive (F3-PR1)', () => {
  it('announces polite messages via role=status', () => {
    render(<LiveRegion message="Captura guardada correctamente." />)
    const region = screen.getByRole('status')
    expect(region).toHaveTextContent('Captura guardada correctamente.')
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('announces urgent conflicts assertively', () => {
    render(
      <LiveRegion message="Conflicto de envío. Revise el intento." assertive />,
    )
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })

  it('keeps the node mounted while empty so announcements are never lost', () => {
    const { container } = render(<LiveRegion message="" />)
    expect(container.querySelector('[aria-live]')).not.toBeNull()
  })

  it('carries no hardcoded brand hex, font-family, or radius literal in the component source (F3-PR3)', () => {
    const source = readFileSync(join(here, 'LiveRegion.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/font-family|fontFamily|Manrope|['"]Inter['"]/i)
    expect(source).not.toMatch(/border-?radius\s*[:=]\s*['"]?\d/i)
  })
})
