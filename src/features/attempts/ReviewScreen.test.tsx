import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import { ReviewScreen } from './ReviewScreen'

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        review: {
          title: 'Revisión del intento',
          counted: 'Contadas',
          pending: 'Pendientes',
          completeness: '{{counted}} de {{total}} líneas contadas',
          finalize: 'Finalizar conteo',
          finalizing: 'Finalizando…',
          confirmTitle: 'Confirmar finalización',
          confirmMessage_one: 'Hay {{count}} línea sin contar. ¿Finalizar de todos modos?',
          confirmMessage_other: 'Hay {{count}} líneas sin contar. ¿Finalizar de todos modos?',
          confirm: 'Confirmar',
          cancel: 'Cancelar',
          locked: 'Conteo finalizado y bloqueado.',
          loadError: 'No se pudo cargar la revisión.',
          emptyPending: 'Sin líneas pendientes.',
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

async function freshAttempt() {
  await mockInventoryApi.resetDemo()
  return mockInventoryApi.startAttempt('scope-centro', 'guided')
}

describe('ReviewScreen', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('renders counted values verbatim and pending lines with identity and unit only', async () => {
    const attempt = await freshAttempt()
    render(<ReviewScreen attemptId={attempt.id} />, { wrapper: Providers })

    const counted = await screen.findByRole('region', { name: 'Contadas' })
    expect(within(counted).getByText('10.10')).toBeVisible()
    expect(within(counted).getByText('9007199254740993.000001')).toBeVisible()

    const pending = screen.getByRole('region', { name: 'Pendientes' })
    expect(within(pending).getByText('SKU-001')).toBeVisible()
    expect(within(pending).getByText('Caja demo')).toBeVisible()
    expect(within(pending).getByText('UN')).toBeVisible()
    expect(screen.getByText('4 de 5 líneas contadas')).toBeVisible()
  })

  it('moves a newly counted line from pending to counted', async () => {
    const attempt = await freshAttempt()
    await mockInventoryApi.saveBatch(attempt.id, 'review-key-1', [
      { lineCode: 'SKU-001', quantity: '7.5', state: 'COUNTED' },
    ])
    render(<ReviewScreen attemptId={attempt.id} />, { wrapper: Providers })

    const counted = await screen.findByRole('region', { name: 'Contadas' })
    expect(within(counted).getByText('7.5')).toBeVisible()
    const pending = screen.getByRole('region', { name: 'Pendientes' })
    expect(within(pending).queryByText('SKU-001')).toBeNull()
    expect(screen.getByText('5 de 5 líneas contadas')).toBeVisible()
  })

  it('opens a 422 confirm dialog and locks on confirm', async () => {
    const user = userEvent.setup()
    const attempt = await freshAttempt()
    render(<ReviewScreen attemptId={attempt.id} />, { wrapper: Providers })
    await screen.findByRole('region', { name: 'Pendientes' })

    await user.click(screen.getByRole('button', { name: 'Finalizar conteo' }))

    const dialog = await screen.findByRole('dialog')
    // AntD portals carry no jsdom layout, so presence (not visibility) proves
    // the 422 path opened the dialog with the pending count.
    expect(within(dialog).getByText(/1 línea sin contar/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Conteo finalizado y bloqueado.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Finalizar conteo' })).toBeNull()
  })

  it('finalizes directly without a dialog when nothing is pending', async () => {
    const user = userEvent.setup()
    const attempt = await freshAttempt()
    await mockInventoryApi.saveBatch(attempt.id, 'review-key-2', [
      { lineCode: 'SKU-001', quantity: '7.5', state: 'COUNTED' },
    ])
    render(<ReviewScreen attemptId={attempt.id} />, { wrapper: Providers })
    await screen.findByRole('region', { name: 'Contadas' })

    await user.click(screen.getByRole('button', { name: 'Finalizar conteo' }))

    expect(await screen.findByText('Conteo finalizado y bloqueado.')).toBeVisible()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
