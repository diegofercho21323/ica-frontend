import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../src/app/App'

describe('application shell', () => {
  it('renders the Spanish foundation shell at the root route', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Captura ciega de inventario',
      }),
    ).toBeVisible()
    expect(screen.getByText('Demostración local')).toBeVisible()
  })
})
