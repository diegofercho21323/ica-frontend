import { FileDoneOutlined } from '@ant-design/icons'
import { Alert, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { LoginForm } from '../features/access/LoginForm'
import { useSession } from '../features/access/SessionContext'
import { ReviewScreen } from '../features/attempts/ReviewScreen'
import { BodegasList } from '../features/bodegas/BodegasList'
import { GuidedCapture } from '../features/capture/guided/GuidedCapture'
import { ManualCapture } from '../features/capture/manual/ManualCapture'
import { buildGuidedCaptureStrings, buildManualCaptureStrings } from '../features/capture/i18n'
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

/**
 * Legacy attempt-less capture is dropped: blind capture always runs inside a
 * started attempt. The bare `/capture` entry now routes to scope selection,
 * where an attempt is started before `/capture/:attemptId` opens.
 */
export function CapturePage() {
  return <Navigate to="/bodegas" replace />
}

/**
 * Routes to the two Tallycore capture screens (F3-PR4) by the attempt's
 * `mode` (`guided`/`manual`), carried as `?mode=` so it survives a reload
 * (router `state` does not). A missing or invalid `mode` — e.g. a stale
 * bookmark predating this query param — falls back to guided capture rather
 * than crashing.
 */
export function AttemptCapturePage() {
  const { t } = useTranslation()
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()

  if (!attemptId) {
    return (
      <section>
        <Alert message={t('review.notFound')} role="alert" type="error" />
      </section>
    )
  }

  const mode = searchParams.get('mode') === 'manual' ? 'manual' : 'guided'

  return (
    <div className="flex flex-col gap-3">
      {mode === 'manual' ? (
        <ManualCapture attemptId={attemptId} strings={buildManualCaptureStrings(t)} />
      ) : (
        <GuidedCapture
          attemptId={attemptId}
          mode="guided"
          strings={buildGuidedCaptureStrings(t)}
        />
      )}
      <div className="flex justify-center">
        <Link
          to={`/attempts/${attemptId}/review`}
          className="text-primary flex items-center gap-1.5 text-sm font-medium"
        >
          <FileDoneOutlined aria-hidden />
          {t('review.title')}
        </Link>
      </div>
    </div>
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
