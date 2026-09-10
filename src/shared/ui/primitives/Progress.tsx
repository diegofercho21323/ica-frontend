import { Progress as AntProgress } from 'antd'
import type { ProgressProps as AntProgressProps } from 'antd'
import { LiveRegion } from './LiveRegion'

export type ProgressProps = Omit<AntProgressProps, 'percent' | 'format'> & {
  /** Current progress amount. */
  value: number
  /** Target amount that represents completion. */
  max: number
  /** Translated caption, always rendered as text (never numeric- or color-only). */
  label: string
  /** Translated "{value} of {max}" phrasing; shown and announced via a live region. */
  valueText: string
}

/**
 * Themed progress primitive. The wrapper carries the `progressbar` role with
 * `value`/`max` bounds; a text label plus a `{value} of {max}` live-region
 * announcement keep progress off color alone. Track and fill colors resolve
 * through `ConfigProvider` tokens — zero hex here. No business logic.
 */
export function Progress({ value, max, label, valueText, ...rest }: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      className="flex w-full flex-col gap-1"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <span>{label}</span>
      <AntProgress {...rest} percent={percent} />
      <LiveRegion message={valueText} />
    </div>
  )
}
