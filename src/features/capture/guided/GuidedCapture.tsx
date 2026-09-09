import { useEffect, useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Button } from '../../../shared/ui/primitives/Button'
import { ItemCard } from '../../../shared/ui/primitives/ItemCard'
import { LiveRegion } from '../../../shared/ui/primitives/LiveRegion'
import { NumericInput } from '../../../shared/ui/primitives/NumericInput'
import { SearchInput } from '../../../shared/ui/primitives/SearchInput'
import type { RowState } from '../validation'
import {
  resolveShortcut,
  useGuidedCapture,
  type CaptureMethod,
  type GuidedMode,
} from './useGuidedCapture'

/**
 * Every user-facing string arrives via props (the caller passes `t()`
 * output), so guided capture never touches `es.json` and never hardcodes
 * copy. Quantities stay exact strings end to end; units are read-only.
 */
export type GuidedCaptureStrings = {
  progressLabel: (counted: number, total: number) => string
  stateLabels: Record<RowState, string>
  actionLabel: string
  qtyLabel: string
  saveLabel: string
  savingLabel: string
  prevLabel: string
  nextLabel: string
  searchLabel: string
  searchPlaceholder: string
  searchResultsLabel: (count: number) => string
  searchEmptyLabel: string
  searchCloseLabel: string
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
  manualEmptyLabel: string
  pendingLookupLabel: string
}

type GuidedCaptureProps = {
  attemptId: string
  mode: GuidedMode
  strings: GuidedCaptureStrings
}

/**
 * One-line guided assistant + manual mode (F3-PR2). Guided presents a single
 * `ItemCard`, saves auto-advance, history stays editable via search; manual
 * starts empty with scan/`Ctrl+K`/pending-lookup entry points. The full loop
 * runs keyboard-only (`Enter` save, arrows prev/next, `Ctrl+K` search, `Esc`
 * close) with pointer equivalents on every action. Blind-safe: names + units
 * only, never stock, prior counts, or variance.
 */
export function GuidedCapture({ attemptId, mode, strings }: GuidedCaptureProps) {
  const guided = useGuidedCapture(attemptId, mode)
  const { current, progress } = guided
  const [qty, setQty] = useState('')
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'pending'>('all')
  const qtyInputId = useId()
  const confirmBodyId = useId()

  const currentCode = current?.code
  useEffect(() => {
    setQty('')
  }, [currentCode])

  const results = useMemo(() => {
    const pool =
      scope === 'pending'
        ? guided.pending.map((entry) => ({ ...entry }))
        : guided.lines.map(({ code, name, unit }) => ({ code, name, unit }))
    const needle = query.trim().toLowerCase()
    return pool
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
  }, [scope, guided.pending, guided.lines, query, strings.unitLabel])

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
    if (action === 'save') {
      event.preventDefault()
      doSave('keyboard')
    } else if (action === 'prev') {
      event.preventDefault()
      guided.prev()
    } else if (action === 'next') {
      event.preventDefault()
      guided.next()
    } else if (action === 'search') {
      event.preventDefault()
      setScope('all')
      guided.setSearchOpen(true)
    } else if (action === 'close' && guided.searchOpen) {
      guided.setSearchOpen(false)
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
      className="flex w-full flex-col gap-4"
    >
      <p className="m-0 text-sm">{strings.progressLabel(progress.counted, progress.total)}</p>
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
        <p className="m-0">{strings.manualEmptyLabel}</p>
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
        <Button onClick={() => guided.prev()} disabled={guided.lines.length === 0}>
          {strings.prevLabel}
        </Button>
        <Button
          type="primary"
          onClick={() => doSave('keyboard')}
          loading={guided.isSaving}
          loadingLabel={strings.savingLabel}
          disabled={guided.isSaving || current === null}
        >
          {guided.isSaving ? strings.savingLabel : strings.saveLabel}
        </Button>
        <Button onClick={() => guided.next()} disabled={guided.lines.length === 0}>
          {strings.nextLabel}
        </Button>
        <Button
          onClick={() => {
            setScope('pending')
            guided.setSearchOpen(true)
          }}
        >
          {strings.pendingLookupLabel}
        </Button>
      </div>
      <SearchInput
        label={strings.searchLabel}
        placeholder={strings.searchPlaceholder}
        inputValue={query}
        onInputChange={setQuery}
        results={results}
        open={guided.searchOpen}
        onOpen={() => guided.setSearchOpen(true)}
        onClose={() => guided.setSearchOpen(false)}
        onSelect={(id) => {
          guided.selectLine(id)
          setQty('')
          setQuery('')
          guided.setSearchOpen(false)
        }}
        resultsLabel={strings.searchResultsLabel}
        emptyLabel={strings.searchEmptyLabel}
        closeLabel={strings.searchCloseLabel}
      />
      {guided.pendingConfirm ? (
        <div
          role="alertdialog"
          aria-label={strings.confirmTitle}
          aria-describedby={confirmBodyId}
          className="flex w-full flex-col gap-2 rounded-lg border border-solid p-4"
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
    </section>
  )
}
