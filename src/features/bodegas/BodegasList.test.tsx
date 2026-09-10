import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router'
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
      },
    },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

function Providers({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </I18nextProvider>
    </MemoryRouter>
  )
}

describe('BodegasList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sets aria-busy while the scopes query is pending', () => {
    vi.spyOn(mockInventoryApi, 'listScopes').mockImplementation(
      () => new Promise(() => {}),
    )
    const { container } = render(<BodegasList />, { wrapper: Providers })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole('status')).toBeVisible()
  })

  it('renders one card per scope keyed by id when populated', async () => {
    vi.spyOn(mockInventoryApi, 'listScopes').mockResolvedValue([
      { id: 'scope-centro', name: 'Bodega Centro' },
      { id: 'scope-norte', name: 'Bodega Norte' },
      { id: 'scope-sur', name: 'Bodega Sur' },
    ])
    render(<BodegasList />, { wrapper: Providers })
    expect(await screen.findByText('Bodega Centro')).toBeVisible()
    expect(screen.getByText('Bodega Norte')).toBeVisible()
    expect(screen.getByText('Bodega Sur')).toBeVisible()
    expect(screen.getByText('Bodegas')).toBeVisible()
  })

  it('renders emptyWarehouses copy with zero cards when scopes are empty', async () => {
    vi.spyOn(mockInventoryApi, 'listScopes').mockResolvedValue([])
    render(<BodegasList />, { wrapper: Providers })
    expect(
      await screen.findByText('No hay bodegas disponibles para esta demo.'),
    ).toBeVisible()
    expect(screen.queryByText('Bodega Centro')).toBeNull()
  })

  it('renders role=alert with warehousesError copy when the query fails', async () => {
    vi.spyOn(mockInventoryApi, 'listScopes').mockRejectedValue(new Error('boom'))
    render(<BodegasList />, { wrapper: Providers })
    expect(
      await screen.findByRole('alert'),
    ).toBeVisible()
    expect(
      screen.getByText('No se pudieron cargar las bodegas.'),
    ).toBeVisible()
  })
})
