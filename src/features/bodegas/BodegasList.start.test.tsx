import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import { BodegasList } from './BodegasList'

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        app: {
          warehouses: 'Bodegas',
          warehousesCount: '{{count}} bodegas',
          warehousesError: 'No se pudieron cargar las bodegas.',
          emptyWarehouses: 'No hay bodegas disponibles para esta demo.',
          loadingPlaceholder: 'Cargando contenido de demostración',
        },
        attempt: {
          start: 'Iniciar captura',
          modeLabel: 'Modo de conteo',
          modeGuided: 'Guiado',
          modeManual: 'Manual',
          starting: 'Iniciando…',
          startError: 'No se pudo iniciar el intento. Reintente.',
        },
      },
    },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

function Providers({ children }: PropsWithChildren) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nextProvider>
  )
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/bodegas',
        element: (
          <Providers>
            <BodegasList />
          </Providers>
        ),
      },
      { path: '/capture/:attemptId', element: <h1>Captura del intento</h1> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('BodegasList attempt entry', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
    vi.restoreAllMocks()
  })

  it('starts a guided attempt from scope selection and routes to its capture', async () => {
    const user = userEvent.setup()
    const router = renderAt('/bodegas')
    await screen.findByText('Bodega Centro')

    const cards = screen.getAllByRole('button', { name: 'Iniciar captura' })
    await user.click(cards[0])

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/capture/att-1-scope-centro')
    })
    expect(router.state.location.search).toBe('?mode=guided')
    expect(await screen.findByText('Captura del intento')).toBeVisible()
  })

  it('starts a manual attempt when manual mode is selected and shows t() errors', async () => {
    const user = userEvent.setup()
    const startAttempt = vi.spyOn(mockInventoryApi, 'startAttempt')
    const router = renderAt('/bodegas')
    await screen.findByText('Bodega Centro')

    // Failure first: the list stays mounted so the t() error is visible.
    startAttempt.mockRejectedValueOnce(new Error('boom'))
    await user.click(screen.getAllByRole('button', { name: 'Iniciar captura' })[2])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo iniciar el intento. Reintente.',
    )

    await user.click(screen.getByRole('radio', { name: 'Manual' }))
    await user.click(screen.getAllByRole('button', { name: 'Iniciar captura' })[1])

    await waitFor(() => {
      expect(startAttempt).toHaveBeenCalledWith('scope-norte', 'manual')
    })
    expect(router.state.location.pathname).toBe('/capture/att-1-scope-norte')
    expect(router.state.location.search).toBe('?mode=manual')
  })
})
