import { Table as AntTable } from 'antd'
import type { TableProps as AntTableProps } from 'antd'

export type TableProps<T> = AntTableProps<T> & {
  /**
   * Translated label for the horizontal scroll region. Per visual-shell, a
   * narrow viewport gets a bounded `overflow-x:auto` container that stays
   * keyboard-reachable rather than clipping columns.
   */
  scrollRegionLabel: string
}

/**
 * Themed data-table primitive. Rows and columns come straight from props; the
 * table sits inside a labelled, focusable scroll region so it degrades on
 * narrow widths without losing columns. Border, radius, and header colors
 * resolve through `ConfigProvider` tokens — zero hex here. No business logic.
 */
export function Table<T extends object>({ scrollRegionLabel, ...rest }: TableProps<T>) {
  return (
    <div
      role="region"
      aria-label={scrollRegionLabel}
      tabIndex={0}
      className="w-full overflow-x-auto"
    >
      <AntTable<T> pagination={false} scroll={{ x: 'max-content' }} {...rest} />
    </div>
  )
}
