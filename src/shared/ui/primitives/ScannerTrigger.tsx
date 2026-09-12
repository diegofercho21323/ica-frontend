import { Input } from 'antd'
import { useId } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { SearchInput, type SearchInputProps } from './SearchInput'

export type ScannerTriggerProps = {
  /** Translated label for the trigger button (also its accessible name). */
  triggerLabel: string
  /** Translated dialog title (also the dialog's accessible name). */
  dialogTitle: string
  /** Translated close-control label for the dialog. */
  closeLabel: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** Barcode/name search step — passthrough to `SearchInput`. */
  search: SearchInputProps
  /** Translated label for the manual-add fallback control. */
  manualAddLabel: string
  manualAddOpen: boolean
  onManualAddOpen: () => void
  /** Manual-add fields — explicit name + unit, never inferred from search. */
  manualName: string
  manualNameLabel: string
  onManualNameChange: (value: string) => void
  manualUnit: string
  manualUnitLabel: string
  onManualUnitChange: (value: string) => void
  manualSubmitLabel: string
  onManualSubmit: () => void
}

/**
 * Trigger for the barcode/name-search-first, manual-add-fallback flow (F3
 * guided capture). Opens a labelled dialog around `SearchInput`; when no
 * scan/search match is found, a manual-add control reveals explicit name +
 * unit fields (the ERP unit is never inferred from the search step). Submit
 * stays disabled until both fields are non-empty. Composed entirely from
 * `Button` / `Modal` / `SearchInput` / AntD `Input`, so target size and focus
 * ring resolve through the same `ConfigProvider` tokens those primitives
 * already carry — this file has zero literals of its own.
 */
export function ScannerTrigger({
  triggerLabel,
  dialogTitle,
  closeLabel,
  open,
  onOpen,
  onClose,
  search,
  manualAddLabel,
  manualAddOpen,
  onManualAddOpen,
  manualName,
  manualNameLabel,
  onManualNameChange,
  manualUnit,
  manualUnitLabel,
  onManualUnitChange,
  manualSubmitLabel,
  onManualSubmit,
}: ScannerTriggerProps) {
  const nameId = useId()
  const unitId = useId()
  const canSubmit = manualName.trim().length > 0 && manualUnit.trim().length > 0

  return (
    <>
      <Button type="primary" onClick={onOpen}>
        {triggerLabel}
      </Button>
      <Modal open={open} title={dialogTitle} closeLabel={closeLabel} onClose={onClose}>
        <SearchInput {...search} />
        {manualAddOpen ? (
          <div>
            <label htmlFor={nameId}>{manualNameLabel}</label>
            <Input
              id={nameId}
              value={manualName}
              autoComplete="off"
              onChange={(event) => onManualNameChange(event.target.value)}
            />
            <label htmlFor={unitId}>{manualUnitLabel}</label>
            <Input
              id={unitId}
              value={manualUnit}
              autoComplete="off"
              onChange={(event) => onManualUnitChange(event.target.value)}
            />
            <Button type="primary" onClick={onManualSubmit} disabled={!canSubmit}>
              {manualSubmitLabel}
            </Button>
          </div>
        ) : (
          <Button onClick={onManualAddOpen}>{manualAddLabel}</Button>
        )}
      </Modal>
    </>
  )
}
