import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LiveRegion } from './LiveRegion'

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
})
