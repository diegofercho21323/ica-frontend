import { Col, Row } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import { KpiCard } from '../../shared/ui/primitives/KpiCard'
import { selectKpis } from './selectors'

export function DashboardKpis() {
  const { t } = useTranslation()
  const { data, isPending } = useQuery({
    queryKey: ['operator-lines'],
    queryFn: () => mockInventoryApi.getOperatorLines('dashboard'),
  })

  if (isPending) {
    return (
      <section aria-busy="true">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard label={t('app.kpiTotal')} value="0" loading />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard label={t('app.kpiCounted')} value="0" loading />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard label={t('app.kpiPending')} value="0" loading />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard label={t('app.kpiProgress')} value="0" unit="%" loading />
          </Col>
        </Row>
      </section>
    )
  }

  const kpis = selectKpis(data ?? [])
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
