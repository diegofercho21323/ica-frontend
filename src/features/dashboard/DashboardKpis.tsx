import { Col, Row } from 'antd'
import { useTranslation } from 'react-i18next'
import { operatorV2Fixture } from '../../shared/api/inventory/fixtures'
import { KpiCard } from '../../shared/ui/primitives/KpiCard'
import { selectKpis } from './selectors'

/**
 * Dashboard KPI band. There is no "current attempt" on the dashboard and the
 * mock port no longer exposes an attempt-less line read, so the demo KPIs are
 * derived from the deterministic operator fixture. Live per-attempt progress
 * belongs to a later phase once a real reads endpoint exists.
 */
export function DashboardKpis() {
  const { t } = useTranslation()
  const kpis = selectKpis(operatorV2Fixture)

  return (
    <section>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label={t('app.kpiTotal')} value={kpis.total} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label={t('app.kpiCounted')} value={kpis.counted} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label={t('app.kpiPending')} value={kpis.pending} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard label={t('app.kpiProgress')} value={kpis.progress} unit="%" />
        </Col>
      </Row>
    </section>
  )
}
