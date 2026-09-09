import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureTable } from './CaptureTable'
import { mockInventoryApi } from '../../shared/api/inventory/mock'

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

function renderTable(attemptId: string) {
  return render(<CaptureTable attemptId={attemptId} />, { wrapper: Providers })
}

async function freshAttempt() {
  return mockInventoryApi.startAttempt('scope-centro', 'guided')
}

async function selectState(code: string, optionText: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: `Estado ${code}` }))
  // AntD renders dropdown options with title but without an option role in
  // jsdom. Scope to the open dropdown because selected values reuse the
  // same title inside the table, and take the last match: a previous
  // dropdown can linger in the DOM behind the newly opened one.
  const candidates = await screen.findAllByTitle(optionText)
  const inDropdown = candidates.filter(
    (element) => element.closest('.ant-select-dropdown') !== null,
  )
  const match = inDropdown[inDropdown.length - 1] ?? candidates[0]
  // The titled node can be the inner content div with pointer-events none;
  // the clickable option row is its ancestor. rc-select commits the
  // selection on mouseDown, which also closes the dropdown; fireEvent
  // bypasses jsdom pointer-events checks that never clear mid-animation.
  const option = match.closest('.ant-select-item-option') ?? match
  fireEvent.mouseDown(option)
  fireEvent.click(option)
  return user
}

function rowFor(code: string) {
  const row = screen.getByText(code).closest('tr')
  expect(row).not.toBeNull()
  return row as HTMLElement
}

describe('CaptureTable', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders operator lines blind with empty inputs defaulting to NOT_COUNTED', async () => {
    const attempt = await freshAttempt()
    renderTable(attempt.id)

    expect(await screen.findByText('SKU-001')).toBeVisible()
    expect(screen.getByText('SKU-002')).toBeVisible()
    const qty = screen.getByRole('textbox', { name: 'Cantidad SKU-001' })
    expect(qty).toHaveValue('')
    expect(
      within(rowFor('SKU-001')).getByTitle('Sin contar'),
    ).toHaveTextContent('Sin contar')
  })

  it('hides currentQuantity for NOT_COUNTED rows and reveals it once counted', async () => {
    const attempt = await freshAttempt()
    renderTable(attempt.id)
    await screen.findByText('SKU-002')

    expect(screen.queryByText('10.10')).not.toBeInTheDocument()

    await selectState('SKU-002', 'Contada')

    expect(await screen.findByText('10.10')).toBeVisible()
  })

  it('shows an inline error for invalid input and excludes the row from the batch', async () => {
    const attempt = await freshAttempt()
    const saveBatch = vi
      .spyOn(mockInventoryApi, 'saveBatch')
      .mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTable(attempt.id)
    await screen.findByText('SKU-001')

    await user.click(screen.getByRole('textbox', { name: 'Cantidad SKU-001' }))
    await user.keyboard('abc')

    expect(
      await screen.findByText('Cantidad inválida. Use hasta 6 decimales.'),
    ).toBeVisible()

    await selectState('SKU-001', 'Contada')
    await user.click(screen.getByRole('button', { name: 'Guardar captura' }))

    await waitFor(() => {
      expect(saveBatch).not.toHaveBeenCalled()
    })
  })

  it('saves dirty rows in one batch with a single idempotency key', async () => {
    const attempt = await freshAttempt()
    const saveBatch = vi
      .spyOn(mockInventoryApi, 'saveBatch')
      .mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTable(attempt.id)
    await screen.findByText('SKU-001')

    await user.click(screen.getByRole('textbox', { name: 'Cantidad SKU-001' }))
    await user.keyboard('5')
    await selectState('SKU-001', 'Contada')
    await user.click(screen.getByRole('textbox', { name: 'Cantidad SKU-002' }))
    await user.keyboard('10.10')
    await selectState('SKU-002', 'Contada')

    await user.click(screen.getByRole('button', { name: 'Guardar captura' }))

    await waitFor(() => {
      expect(saveBatch).toHaveBeenCalledTimes(1)
    })
    const [scope, key, payload] = saveBatch.mock.calls[0]
    expect(scope).toBe(attempt.id)
    expect(typeof key).toBe('string')
    expect(key).not.toHaveLength(0)
    expect(payload).toHaveLength(2)
    expect(payload).toContainEqual({
      lineCode: 'SKU-001',
      quantity: '5',
      state: 'COUNTED',
    })
    expect(payload).toContainEqual({
      lineCode: 'SKU-002',
      quantity: '10.10',
      state: 'COUNTED',
    })
    expect(
      await screen.findByText('Captura guardada correctamente.'),
    ).toBeVisible()
  })

  it('reuses the same key on retry and clears dirty flags on success', async () => {
    const attempt = await freshAttempt()
    const saveBatch = vi
      .spyOn(mockInventoryApi, 'saveBatch')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTable(attempt.id)
    await screen.findByText('SKU-001')

    await user.click(screen.getByRole('textbox', { name: 'Cantidad SKU-001' }))
    await user.keyboard('5')
    await selectState('SKU-001', 'Contada')
    await user.click(screen.getByRole('button', { name: 'Guardar captura' }))

    expect(
      await screen.findByText('No se pudo guardar la captura. Reintente.'),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(saveBatch).toHaveBeenCalledTimes(2)
    })
    expect(saveBatch.mock.calls[0][1]).toBe(saveBatch.mock.calls[1][1])
    expect(saveBatch.mock.calls[1][2]).toEqual(saveBatch.mock.calls[0][2])
    expect(
      await screen.findByText('Captura guardada correctamente.'),
    ).toBeVisible()
    const row = screen.getByText('SKU-001').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Guardar captura' }),
    ).toBeDisabled()
  })

  it('sends COUNTED_ZERO as zero string and NOT_FOUND as null', async () => {
    const attempt = await freshAttempt()
    const saveBatch = vi
      .spyOn(mockInventoryApi, 'saveBatch')
      .mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTable(attempt.id)
    await screen.findByText('SKU-003')

    await selectState('SKU-003', 'Contada en cero')
    await selectState('SKU-004', 'No encontrada')
    await user.click(screen.getByRole('button', { name: 'Guardar captura' }))

    await waitFor(() => {
      expect(saveBatch).toHaveBeenCalledTimes(1)
    })
    const [, , payload] = saveBatch.mock.calls[0]
    expect(payload).toContainEqual({
      lineCode: 'SKU-003',
      quantity: '0',
      state: 'COUNTED_ZERO',
    })
    expect(payload).toContainEqual({
      lineCode: 'SKU-004',
      quantity: null,
      state: 'NOT_FOUND',
    })
  })
})
