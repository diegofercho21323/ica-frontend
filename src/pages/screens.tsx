import { Alert, Card, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useParams } from 'react-router'
import { LoginForm } from '../features/access/LoginForm'
import { useSession } from '../features/access/SessionContext'
import { ReviewScreen } from '../features/attempts/ReviewScreen'
import { BodegasList } from '../features/bodegas/BodegasList'
import { CaptureTable } from '../features/capture/CaptureTable'
import { DashboardKpis } from '../features/dashboard/DashboardKpis'

export function LoginPage() {
  const { session, status } = useSession()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const target = from?.startsWith('/') === true ? from : '/dashboard'

  if (status === 'loading') return null
  if (session) return <Navigate to={target} replace />
  return <LoginForm />
}

export function DashboardPage() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4 pt-2">
      <Typography.Title>{t('app.dashboard')}</Typography.Title>
      <DashboardKpis />
    </section>
  )
}

export function BodegasPage() {
  return <BodegasList />
}

export function CapturePage() {
  return (
    <Card>
      <CaptureTable />
    </Card>
  )
}

export function AttemptCapturePage() {
  const { attemptId } = useParams()
  return (
    <Card>
      <CaptureTable attemptId={attemptId} />
    </Card>
  )
}

export function ReviewPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  if (!id) {
    return (
      <section>
        <Alert message={t('review.notFound')} role="alert" type="error" />
      </section>
    )
  }
  return <ReviewScreen attemptId={id} />
}
