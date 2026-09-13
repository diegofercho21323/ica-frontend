import { Card, Skeleton, Statistic } from 'antd'

export type KpiCardProps = {
  label: string
  value: string
  unit?: string
  loading?: boolean
}

/**
 * Presentational KPI primitive. Props only — no hooks, no fetch, no
 * selectors. Values arrive as exact-decimal strings from the caller.
 */
export function KpiCard({ label, value, unit, loading = false }: KpiCardProps) {
  if (loading) {
    return (
      <Card variant="borderless" className="shadow-sm" aria-busy="true">
        <Skeleton active paragraph={false} title={{ width: '60%' }} />
      </Card>
    )
  }
  return (
    <Card variant="borderless" className="shadow-sm">
      <Statistic title={label} value={value} suffix={unit} />
    </Card>
  )
}
