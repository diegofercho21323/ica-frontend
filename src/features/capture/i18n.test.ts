import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildGuidedCaptureStrings, buildManualCaptureStrings } from './i18n'

// Features must not import from `app/` (FSD boundary); this mirrors the
// inline-translation convention already used by CaptureTable.test.tsx rather
// than importing `es.json` directly.
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'es',
    interpolation: { escapeValue: false },
    resources: {
      es: {
        translation: {
          capture: {
            quantity: 'Cantidad',
            unit: 'Unidad',
            saving: 'Guardando…',
            saveError: 'No se pudo guardar.',
            invalidQuantity: 'Cantidad inválida.',
            quantityRequired: 'La cantidad es obligatoria.',
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
        },
      },
    },
  })
})

describe('capture i18n string builders (es capture keys)', () => {
  it('builds guided-capture strings in Spanish from es.json', () => {
    const strings = buildGuidedCaptureStrings(i18n.t)
    expect(strings.saveLabel).toBe('Guardar y continuar')
    expect(strings.progressLabel(2, 5)).toBe('Avance 2 de 5')
    expect(strings.searchResultsLabel(3)).toBe('3 resultados')
    expect(strings.stateLabels.COUNTED).toBe('Contada')
    expect(strings.unitLabel).toBe('Unidad')
  })

  it('never mutates the quantity string when interpolating the confirm body', () => {
    const strings = buildGuidedCaptureStrings(i18n.t)
    expect(strings.confirmBody('9007199254740993.000001')).toContain(
      '9007199254740993.000001',
    )
  })

  it('builds manual-capture strings in Spanish from es.json', () => {
    const strings = buildManualCaptureStrings(i18n.t)
    expect(strings.scanTriggerLabel).toBe('Escanear o buscar')
    expect(strings.pendingLookupLabel).toBe('Ver pendientes')
    expect(strings.searchResultsLabel(1)).toBe('1 resultados')
    expect(strings.stateLabels.NOT_FOUND).toBe('No encontrada')
  })
})
