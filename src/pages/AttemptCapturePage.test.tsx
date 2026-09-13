import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import i18n from 'i18next'
import type { PropsWithChildren } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { InventoryApiProvider } from '../shared/api/inventory/api-context'
import { mockInventoryApi } from '../shared/api/inventory/mock'
import { AttemptCapturePage } from './screens'

// Inline resource dictionary (not imported from `app/i18n/config`): `pages/`
// must not depend on `app/` (FSD boundary, enforced by `npm run fsd`). Covers
// exactly the `guidedCapture`/`manualCapture`/`capture` keys consumed by
// `buildGuidedCaptureStrings`/`buildManualCaptureStrings`.
void i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        capture: {
          quantity: 'Cantidad',
          unit: 'Unidad',
          saving: 'Guardando…',
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
        guidedCapture: {
          progress: 'Avance {{counted}} de {{total}}',
          action: 'Contar esta línea',
          save: 'Guardar y continuar',
          prev: 'Anterior',
          next: 'Siguiente',
          searchLabel: 'Buscar línea',
          searchPlaceholder: 'SKU o nombre',
          searchResults: '{{count}} resultados',
          searchEmpty: 'Sin resultados',
          searchClose: 'Cerrar búsqueda',
          unitMismatch: 'La unidad no coincide con la línea.',
          saved: 'Línea guardada.',
          confirmNeeded: 'Cantidad inusual pendiente de confirmación.',
          confirmTitle: 'Confirmar cantidad inusual',
          confirmBody: 'Confirmar el envío de {{quantity}} tal cual, sin redondear.',
          confirmYes: 'Confirmar y reenviar',
          confirmNo: 'Revisar',
          manualEmpty: 'Escanee o busque una línea para empezar.',
          pendingLookup: 'Ver pendientes',
        },
        manualCapture: {
          empty: 'Escanee o busque una línea para empezar.',
          save: 'Guardar',
          scanTrigger: 'Escanear o buscar',
          scanDialogTitle: 'Buscar o escanear línea',
          scanClose: 'Cerrar',
          manualAdd: 'Agregar manualmente',
          manualName: 'Nombre',
          manualSubmit: 'Agregar',
          pendingLookup: 'Ver pendientes',
          pendingDialogTitle: 'Líneas pendientes',
          pendingEmpty: 'Sin líneas pendientes.',
        },
        review: {
          notFound: 'Intento no encontrado.',
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
      <InventoryApiProvider api={mockInventoryApi}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </InventoryApiProvider>
    </I18nextProvider>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AttemptCapturePage />} path="/capture/:attemptId" />
      </Routes>
    </MemoryRouter>,
    { wrapper: Providers },
  )
}

describe('AttemptCapturePage routing by attempt mode (F3-PR5)', () => {
  it('renders GuidedCapture for a guided attempt', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    renderAt(`/capture/${attempt.id}?mode=guided`)

    // The label renders both as a visible caption and (identically) inside
    // the sr-only live-region announcer, so two matches is expected here.
    expect((await screen.findAllByText(/^Avance \d+ de \d+$/)).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: 'Escanear o buscar' }),
    ).not.toBeInTheDocument()
  })

  it('renders ManualCapture for a manual attempt', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'manual')
    renderAt(`/capture/${attempt.id}?mode=manual`)

    expect(
      await screen.findByRole('button', { name: 'Escanear o buscar' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Avance \d+ de \d+$/)).not.toBeInTheDocument()
  })

  it('falls back to guided capture without crashing when the mode param is missing', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    renderAt(`/capture/${attempt.id}`)

    expect((await screen.findAllByText(/^Avance \d+ de \d+$/)).length).toBeGreaterThan(0)
  })

  it('falls back to guided capture without crashing when the mode param is invalid', async () => {
    await mockInventoryApi.resetDemo()
    const attempt = await mockInventoryApi.startAttempt('scope-centro', 'guided')
    renderAt(`/capture/${attempt.id}?mode=bogus`)

    expect((await screen.findAllByText(/^Avance \d+ de \d+$/)).length).toBeGreaterThan(0)
  })
})
