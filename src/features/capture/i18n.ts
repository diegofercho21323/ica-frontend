import type { TFunction } from 'i18next'
import type { RowState } from './validation'
import type { GuidedCaptureStrings } from './guided/GuidedCapture'
import type { ManualCaptureStrings } from './manual/ManualCapture'

function stateLabels(t: TFunction): Record<RowState, string> {
  return {
    NOT_COUNTED: t('capture.states.notCounted'),
    COUNTED: t('capture.states.counted'),
    COUNTED_ZERO: t('capture.states.countedZero'),
    NOT_FOUND: t('capture.states.notFound'),
  }
}

/**
 * Builds `GuidedCaptureStrings` from `t()` (capture-related `es.json` keys
 * under `guidedCapture` + the shared `capture`/`attempt` namespaces). The
 * component itself never imports `es.json` — this is the adapter the caller
 * uses to supply the strings prop.
 */
export function buildGuidedCaptureStrings(t: TFunction): GuidedCaptureStrings {
  return {
    progressLabel: (counted, total) => t('guidedCapture.progress', { counted, total }),
    stateLabels: stateLabels(t),
    actionLabel: t('guidedCapture.action'),
    qtyLabel: t('capture.quantity'),
    saveLabel: t('guidedCapture.save'),
    savingLabel: t('capture.saving'),
    prevLabel: t('guidedCapture.prev'),
    nextLabel: t('guidedCapture.next'),
    searchLabel: t('guidedCapture.searchLabel'),
    searchPlaceholder: t('guidedCapture.searchPlaceholder'),
    searchResultsLabel: (count) => t('guidedCapture.searchResults', { count }),
    searchEmptyLabel: t('guidedCapture.searchEmpty'),
    searchCloseLabel: t('guidedCapture.searchClose'),
    unitLabel: t('capture.unit'),
    invalidQtyLabel: t('capture.invalidQuantity'),
    qtyRequiredLabel: t('capture.quantityRequired'),
    unitMismatchLabel: t('guidedCapture.unitMismatch'),
    savedLabel: t('guidedCapture.saved'),
    confirmNeededLabel: t('guidedCapture.confirmNeeded'),
    saveErrorLabel: t('capture.saveError'),
    confirmTitle: t('guidedCapture.confirmTitle'),
    confirmBody: (quantity) => t('guidedCapture.confirmBody', { quantity }),
    confirmYesLabel: t('guidedCapture.confirmYes'),
    confirmNoLabel: t('guidedCapture.confirmNo'),
    manualEmptyLabel: t('guidedCapture.manualEmpty'),
    pendingLookupLabel: t('guidedCapture.pendingLookup'),
  }
}

/**
 * Builds `ManualCaptureStrings` from `t()` (capture-related `es.json` keys
 * under `manualCapture` + the shared `capture` namespace).
 */
export function buildManualCaptureStrings(t: TFunction): ManualCaptureStrings {
  return {
    emptyLabel: t('manualCapture.empty'),
    qtyLabel: t('capture.quantity'),
    saveLabel: t('manualCapture.save'),
    savingLabel: t('capture.saving'),
    unitLabel: t('capture.unit'),
    invalidQtyLabel: t('capture.invalidQuantity'),
    qtyRequiredLabel: t('capture.quantityRequired'),
    unitMismatchLabel: t('guidedCapture.unitMismatch'),
    savedLabel: t('guidedCapture.saved'),
    confirmNeededLabel: t('guidedCapture.confirmNeeded'),
    saveErrorLabel: t('capture.saveError'),
    confirmTitle: t('guidedCapture.confirmTitle'),
    confirmBody: (quantity) => t('guidedCapture.confirmBody', { quantity }),
    confirmYesLabel: t('guidedCapture.confirmYes'),
    confirmNoLabel: t('guidedCapture.confirmNo'),
    stateLabels: stateLabels(t),
    actionLabel: t('guidedCapture.action'),
    scanTriggerLabel: t('manualCapture.scanTrigger'),
    scanDialogTitle: t('manualCapture.scanDialogTitle'),
    scanCloseLabel: t('manualCapture.scanClose'),
    searchLabel: t('guidedCapture.searchLabel'),
    searchPlaceholder: t('guidedCapture.searchPlaceholder'),
    searchResultsLabel: (count) => t('guidedCapture.searchResults', { count }),
    searchEmptyLabel: t('guidedCapture.searchEmpty'),
    manualAddLabel: t('manualCapture.manualAdd'),
    manualNameLabel: t('manualCapture.manualName'),
    manualUnitLabel: t('capture.unit'),
    manualSubmitLabel: t('manualCapture.manualSubmit'),
    pendingLookupLabel: t('manualCapture.pendingLookup'),
    pendingDialogTitle: t('manualCapture.pendingDialogTitle'),
    pendingEmptyLabel: t('manualCapture.pendingEmpty'),
  }
}
