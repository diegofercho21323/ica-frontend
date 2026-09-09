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

// Exact-decimal system figures from the scope-centro fixture. If any of these
// strings reaches the operator DOM — as text, title, or aria — the blind
// count degrades into confirming the system's own number.
const LEAKY_QTYS = ['10.10', '9007199254740993.000001']

function expectNoSystemQtyInDom(container: HTMLElement) {
  const html = container.innerHTML
  for (const qty of LEAKY_QTYS) {
    // Visible text.
    expect(screen.queryByText(qty)).not.toBeInTheDocument()
    // Serialized attributes: title, aria-*, value, and anything else AntD
    // may stamp onto the row while rendering the system column.
    expect(html).not.toContain(qty)
  }
}

async function selectCounted(code: string, optionText: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: `Estado ${code}` }))
  const candidates = await screen.findAllByTitle(optionText)
  const inDropdown = candidates.filter(
    (element) => element.closest('.ant-select-dropdown') !== null,
  )
  const match = inDropdown[inDropdown.length - 1] ?? candidates[0]
  const option = match.closest('.ant-select-item-option') ?? match
  fireEvent.mouseDown(option)
  fireEvent.click(option)
}

describe('CaptureTable operator blindness (F6-P1)', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('never renders operator system quantities in the DOM (text, title, or aria) by default', async () => {
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    // Guard the guard: the fixture MUST carry real system figures, otherwise
    // every assertion below would pass vacuously on empty data.
    const lines = await mockInventoryApi.getOperatorLines(attempt.id)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.map((line) => line.currentQuantity)).toContain('10.10')

    const { container } = render(<CaptureTable attemptId={attempt.id} />, {
      wrapper: Providers,
    })
    await screen.findByText('SKU-001')

    expect(screen.getAllByText('Oculta')).toHaveLength(5)
    expectNoSystemQtyInDom(container)
  })

  it('keeps system quantities hidden after rows leave NOT_COUNTED (counted and counted-zero)', async () => {
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    const { container } = render(<CaptureTable attemptId={attempt.id} />, {
      wrapper: Providers,
    })
    await screen.findByText('SKU-002')

    await selectCounted('SKU-002', 'Contada')
    await selectCounted('SKU-003', 'Contada en cero')

    // The operator counted from zero knowledge: revealing the system figure
    // now would confirm (or deny) their input against the system's number.
    expect(screen.getAllByText('Oculta')).toHaveLength(5)
    expectNoSystemQtyInDom(container)
  })

  it('reveals system quantities only when showSystemQuantity is set (auditor preview)', async () => {
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    render(<CaptureTable attemptId={attempt.id} showSystemQuantity />, {
      wrapper: Providers,
    })
    await screen.findByText('SKU-002')

    // Even the auditor preview stays blind while a row is NOT_COUNTED.
    expect(screen.getAllByText('Oculta')).toHaveLength(5)

    await selectCounted('SKU-002', 'Contada')

    expect(await screen.findByText('10.10')).toBeVisible()
  })
})
