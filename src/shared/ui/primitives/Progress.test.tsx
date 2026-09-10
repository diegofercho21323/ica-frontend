import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Progress } from './Progress'

const here = dirname(fileURLToPath(import.meta.url))

describe('Progress primitive (F3-PR2)', () => {
  it('exposes value and max on a progressbar', () => {
    render(<Progress value={3} max={10} label="Líneas contadas" valueText="3 de 10 contadas" />)
    const bar = screen.getByRole('progressbar', { name: 'Líneas contadas' })
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '10')
  })

  it('announces progress through a live region with a textual label', () => {
    render(<Progress value={7} max={10} label="Líneas contadas" valueText="7 de 10 contadas" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('7 de 10 contadas')
  })

  it('always shows the text label, not a numeric-only or color-only signal', () => {
    render(
      <Progress value={0} max={4} label="Envíos sincronizados" valueText="0 de 4 sincronizados" />,
    )
    expect(screen.getByText('Envíos sincronizados')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 de 4 sincronizados')
  })

  it('clamps the progressbar bounds when value exceeds max', () => {
    render(
      <Progress value={12} max={10} label="Líneas contadas" valueText="12 de 10 contadas" />,
    )
    const bar = screen.getByRole('progressbar', { name: 'Líneas contadas' })
    expect(bar).toHaveAttribute('aria-valuenow', '12')
    expect(bar).toHaveAttribute('aria-valuemax', '10')
    expect(screen.getByRole('status')).toHaveTextContent('12 de 10 contadas')
  })

  it('carries no hardcoded brand hex or radius literal in the component source', () => {
    const source = readFileSync(join(here, 'Progress.tsx'), 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/borderRadius\s*[:=]\s*['"]?\d/)
  })
})
