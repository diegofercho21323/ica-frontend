import { Button } from './Button'
import { Status, type StatusTone } from './Status'

export type ItemCardProps = {
  /** Line name (identity only — never quantities or stock). */
  name: string
  /** Authoritative ERP unit, exact and untranslated. */
  unit: string
  /** Translated unit caption (caller passes `t()` output). */
  unitLabel: string
  /** Translated state caption (caller passes `t()` output). */
  stateLabel: string
  stateTone: StatusTone
  /** Translated primary-action caption (caller passes `t()` output). */
  actionLabel: string
  onAction: () => void
  actionDisabled?: boolean
}

/**
 * One-line-assistant card (F3 guided capture): name + full ERP unit + state
 * + primary action always visible. Stacks on mobile, rows on `sm:` and up.
 * All user strings arrive via props so `es.json` stays untouched by slices.
 */
export function ItemCard({
  name,
  unit,
  unitLabel,
  stateLabel,
  stateTone,
  actionLabel,
  onAction,
  actionDisabled = false,
}: ItemCardProps) {
  return (
    <article className="bg-layout flex w-full flex-col gap-2 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-base font-semibold">{name}</h3>
        <p className="m-0 text-sm">
          <span>{unitLabel}</span>
          {': '}
          <strong>{unit}</strong>
        </p>
        <Status tone={stateTone} label={stateLabel} />
      </div>
      <Button type="primary" onClick={onAction} disabled={actionDisabled}>
        {actionLabel}
      </Button>
    </article>
  )
}
