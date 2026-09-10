import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import { CaptureTable } from './CaptureTable'

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        capture: {
          title: 'Captura ciega',
          sku: 'SKU',
          description: 'Descripción',
          quantity: 'Cantidad',
          state: 'Estado',
          systemQuantity: 'Existencia del sistema',
          hidden: 'Oculta',
          save: 'Guardar captura',
          saving: 'Guardando…',
          retry: 'Reintentar',
          saveSuccess: 'Captura guardada correctamente.',
          saveError: 'No se pudo guardar la captura. Reintente.',
          invalidQuantity: 'Cantidad inválida. Use hasta 6 decimales.',
          quantityRequired: 'La cantidad es obligatoria para filas contadas.',
          lockedNotice: 'Intento bloqueado. La captura es de solo lectura.',
          states: {
            counted: 'Contada',
            countedZero: 'Contada en cero',
            notFound: 'No encontrada',
            notCounted: 'Sin contar',
          },
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

describe('CaptureTable attempt scope', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('reads attempt lines blind: NOT_COUNTED rows hide the system quantity', async () => {
    const user = userEvent.setup()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    render(<CaptureTable attemptId={attempt.id} />, { wrapper: Providers })
    await screen.findByText('SKU-001')

    // Every row starts NOT_COUNTED, so every system quantity stays hidden.
    expect(screen.getAllByText('Oculta')).toHaveLength(5)
    expect(screen.queryByText('10.10')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Estado SKU-002' }))
    const candidates = await screen.findAllByTitle('Contada')
    const inDropdown = candidates.filter(
      (element) => element.closest('.ant-select-dropdown') !== null,
    )
    const match = inDropdown[inDropdown.length - 1] ?? candidates[0]
    const option = match.closest('.ant-select-item-option') ?? match
    fireEvent.mouseDown(option)
    fireEvent.click(option)

    expect(await screen.findByText('10.10')).toBeVisible()
  })

  it('disables every input once the attempt is locked', async () => {
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    await mockInventoryApi.finalize(attempt.id, { confirm_uncounted: true })
    render(<CaptureTable attemptId={attempt.id} />, { wrapper: Providers })
    await screen.findByText('SKU-001')

    expect(screen.getByRole('textbox', { name: 'Cantidad SKU-001' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Estado SKU-001' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar captura' })).toBeDisabled()
    expect(screen.getByText('Intento bloqueado. La captura es de solo lectura.')).toBeVisible()
  })
})
