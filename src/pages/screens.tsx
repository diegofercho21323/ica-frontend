import { Alert, Card, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

function PlaceholderPage({
  title,
  message,
}: {
  title: string
  message: string
}) {
  const { t } = useTranslation()
  return (
    <section aria-busy="true" style={{ paddingTop: 8 }}>
      <Typography.Title>{title}</Typography.Title>
      <div role="status">{t('app.loadingPlaceholder')}</div>
      <Alert message={message} role="alert" type="info" />
    </section>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  return (
    <PlaceholderPage
      message={t('app.shellPlaceholder')}
      title={t('app.login')}
    />
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  return (
    <PlaceholderPage
      message={t('app.dashboardPlaceholder')}
      title={t('app.dashboard')}
    />
  )
}

export function BodegasPage() {
  const { t } = useTranslation()
  return (
    <PlaceholderPage
      message={t('app.emptyWarehouses')}
      title={t('app.warehouses')}
    />
  )
}

export function CapturePlaceholderPage() {
  const { t } = useTranslation()
  return (
    <Card>
      <PlaceholderPage
        message={t('app.capturePlaceholder')}
        title={t('app.capture')}
      />
    </Card>
  )
}
