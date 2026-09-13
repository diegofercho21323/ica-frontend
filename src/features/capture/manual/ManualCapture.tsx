import { FileSearchOutlined } from '@ant-design/icons'
import { Card } from 'antd'
import { useEffect, useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Button } from '../../../shared/ui/primitives/Button'
import { ItemCard } from '../../../shared/ui/primitives/ItemCard'
import { LiveRegion } from '../../../shared/ui/primitives/LiveRegion'
import { Modal } from '../../../shared/ui/primitives/Modal'
import { NumericInput } from '../../../shared/ui/primitives/NumericInput'
import { ScannerTrigger } from '../../../shared/ui/primitives/ScannerTrigger'
import type { RowState } from '../validation'
import { resolveShortcut, useGuidedCapture, type CaptureMethod } from '../guided/useGuidedCapture'

/**
 * Every user-facing string arrives via props (the caller passes `t()`
 * output), matching the guided screen's convention.
 */
export type ManualCaptureStrings = {
  emptyLabel: string
  qtyLabel: string
  saveLabel: string
  savingLabel: string
  unitLabel: string
  invalidQtyLabel: string
  qtyRequiredLabel: string
  unitMismatchLabel: string
  savedLabel: string
  confirmNeededLabel: string
  saveErrorLabel: string
  confirmTitle: string
  confirmBody: (quantity: string) => string
  confirmYesLabel: string
  confirmNoLabel: string
  stateLabels: Record<RowState, string>
  actionLabel: string
  scanTriggerLabel: string
  scanDialogTitle: string
  scanCloseLabel: string
  searchLabel: string
  searchPlaceholder: string
  searchResultsLabel: (count: number) => string
  searchEmptyLabel: string
  manualAddLabel: string
  manualNameLabel: string
  manualUnitLabel: string
  manualSubmitLabel: string
  pendingLookupLabel: string
  pendingDialogTitle: string
  pendingEmptyLabel: string
}

type ManualCaptureProps = {
  attemptId: string
  strings: ManualCaptureStrings
}

/**
 * Manual capture (F3-PR4, guided-capture "Manual mode with blind lookup").
 * Starts empty and never auto-advances: the operator finds a line through
 * `ScannerTrigger` (barcode/name search, `Ctrl+K`, or the manual-add fallback
 * matched against this attempt's own catalog) or opens the blind
 * pending-identity lookup (names + units only, zero quantities). Reuses
 * `useGuidedCapture(attemptId, 'manual')`, which already starts with no line
 * selected and never auto-advances after a save; this screen only supplies
 * the manual-specific composition and the `ScannerTrigger`-driven entry
 * points. Blind-safe: never renders theoretical stock, prior counts,
 * variance, or ranking.
 */
export function ManualCapture({ attemptId, strings }: ManualCaptureProps) {
  const guided = useGuidedCapture(attemptId, 'manual')
  const { current } = guided
  const [qty, setQty] = useState('')
  const [query, setQuery] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualUnit, setManualUnit] = useState('')
  const [pendingOpen, setPendingOpen] = useState(false)
  const qtyInputId = useId()
  const confirmBodyId = useId()

  const currentCode = current?.code
  useEffect(() => {
    setQty('')
  }, [currentCode])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return guided.lines
      .filter(
        (line) =>
          needle === '' ||
          line.name.toLowerCase().includes(needle) ||
          line.code.toLowerCase().includes(needle),
      )
      .map((line) => ({
        id: line.code,
        title: line.name,
        subtitle: `${strings.unitLabel} ${line.unit}`,
      }))
  }, [guided.lines, query, strings.unitLabel])

  const closeScan = () => {
    setScanOpen(false)
    setManualAddOpen(false)
    setManualName('')
    setManualUnit('')
    setQuery('')
  }

  const pickLine = (code: string) => {
    guided.selectLine(code)
    closeScan()
  }

  const onManualSubmit = () => {
    // No backend contract yet for an unseen SKU: manual-add matches the
    // typed name + unit against this attempt's own catalog only.
    const match = guided.lines.find(
      (line) =>
        line.name.trim().toLowerCase() === manualName.trim().toLowerCase() &&
        line.unit.trim().toLowerCase() === manualUnit.trim().toLowerCase(),
    )
    if (match) pickLine(match.code)
  }

  const doSave = (captureMethod: CaptureMethod) => {
    if (!current) return
    guided.saveCurrent({ quantity: qty, unit: current.unit, captureMethod })
  }

  const onSectionKeyDown = (event: ReactKeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const inField =
      target?.closest('input, textarea, select, [contenteditable="true"]') !== null
    const action = resolveShortcut(event.key, {
      ctrlKey: event.ctrlKey || event.metaKey,
      inField,
    })
    if (!action) return
    if (action === 'search') {
      event.preventDefault()
      setScanOpen(true)
    } else if (action === 'close') {
      if (pendingOpen) setPendingOpen(false)
      else if (scanOpen) closeScan()
    } else if (action === 'save' && current) {
      event.preventDefault()
      doSave('keyboard')
    }
  }

  const fieldError =
    guided.fieldError === 'invalid'
      ? strings.invalidQtyLabel
      : guided.fieldError === 'required'
        ? strings.qtyRequiredLabel
        : guided.fieldError === 'unit-mismatch'
          ? strings.unitMismatchLabel
          : undefined

  const announcement =
    guided.notice === 'saved'
      ? strings.savedLabel
      : guided.notice === 'confirm-required'
        ? strings.confirmNeededLabel
        : guided.notice === 'save-error'
          ? strings.saveErrorLabel
          : ''

  return (
    <section
      aria-busy={guided.isSaving}
      onKeyDown={onSectionKeyDown}
      className="flex w-full justify-center"
    >
      <Card className="flex w-full max-w-2xl flex-col gap-4">
      {current ? (
        <ItemCard
          name={current.name}
          unit={current.unit}
          unitLabel={strings.unitLabel}
          stateLabel={strings.stateLabels[current.state]}
          stateTone={
            current.state === 'NOT_COUNTED'
              ? 'warning'
              : current.state === 'NOT_FOUND'
                ? 'error'
                : 'success'
          }
          actionLabel={strings.actionLabel}
          onAction={() => document.getElementById(qtyInputId)?.focus()}
        />
      ) : (
        <p className="m-0">{strings.emptyLabel}</p>
      )}
      <NumericInput
        id={qtyInputId}
        label={strings.qtyLabel}
        value={qty}
        onChange={setQty}
        error={fieldError}
        disabled={guided.isSaving || current === null}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="primary"
          onClick={() => doSave('keyboard')}
          loading={guided.isSaving}
          loadingLabel={strings.savingLabel}
          disabled={guided.isSaving || current === null}
        >
          {guided.isSaving ? strings.savingLabel : strings.saveLabel}
        </Button>
        <ScannerTrigger
          triggerLabel={strings.scanTriggerLabel}
          dialogTitle={strings.scanDialogTitle}
          closeLabel={strings.scanCloseLabel}
          open={scanOpen}
          onOpen={() => setScanOpen(true)}
          onClose={closeScan}
          search={{
            label: strings.searchLabel,
            placeholder: strings.searchPlaceholder,
            inputValue: query,
            onInputChange: setQuery,
            results,
            open: true,
            onOpen: () => {},
            onClose: closeScan,
            onSelect: pickLine,
            resultsLabel: strings.searchResultsLabel,
            emptyLabel: strings.searchEmptyLabel,
            closeLabel: strings.scanCloseLabel,
          }}
          manualAddLabel={strings.manualAddLabel}
          manualAddOpen={manualAddOpen}
          onManualAddOpen={() => setManualAddOpen(true)}
          manualName={manualName}
          manualNameLabel={strings.manualNameLabel}
          onManualNameChange={setManualName}
          manualUnit={manualUnit}
          manualUnitLabel={strings.manualUnitLabel}
          onManualUnitChange={setManualUnit}
          manualSubmitLabel={strings.manualSubmitLabel}
          onManualSubmit={onManualSubmit}
        />
        <Button
          icon={<FileSearchOutlined aria-hidden />}
          onClick={() => setPendingOpen(true)}
        >
          {strings.pendingLookupLabel}
        </Button>
      </div>
      <Modal
        open={pendingOpen}
        title={strings.pendingDialogTitle}
        closeLabel={strings.scanCloseLabel}
        onClose={() => setPendingOpen(false)}
      >
        {guided.pending.length === 0 ? (
          <p className="m-0">{strings.pendingEmptyLabel}</p>
        ) : (
          <ul role="listbox" aria-label={strings.pendingDialogTitle} className="m-0 list-none p-0">
            {guided.pending.map((line) => (
              <li key={line.code} role="option" aria-selected={false}>
                {line.name} — {strings.unitLabel} {line.unit}
              </li>
            ))}
          </ul>
        )}
      </Modal>
      {guided.pendingConfirm ? (
        <div
          role="alertdialog"
          aria-label={strings.confirmTitle}
          aria-describedby={confirmBodyId}
          className="border-warning bg-layout flex w-full flex-col gap-2 rounded-lg border border-solid p-4"
        >
          <p id={confirmBodyId} className="m-0">
            {strings.confirmBody(guided.pendingConfirm.quantity)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="primary" onClick={() => guided.confirmUnusual()}>
              {strings.confirmYesLabel}
            </Button>
            <Button onClick={() => guided.dismissConfirm()}>{strings.confirmNoLabel}</Button>
          </div>
        </div>
      ) : null}
      <LiveRegion
        message={announcement}
        assertive={guided.notice === 'save-error' || guided.notice === 'confirm-required'}
      />
      </Card>
    </section>
  )
}
