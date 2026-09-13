import { FileDoneOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Divider, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { OperatorLineView, ReviewView } from '../../shared/api/inventory/models'
import { FinalizeDialog } from './FinalizeDialog'
import { useFinalize } from './useFinalize'
import { useReview } from './useReview'

const countedColumns = (
  t: (key: string) => string,
): ColumnsType<OperatorLineView> => [
  { title: t('capture.sku'), dataIndex: 'code', key: 'code' },
  { title: t('capture.description'), dataIndex: 'name', key: 'name' },
  { title: t('capture.unit'), dataIndex: 'unit', key: 'unit' },
  { title: t('capture.state'), dataIndex: 'state', key: 'state' },
  {
    title: t('capture.quantity'),
    key: 'quantity',
    render: (_, row) => row.currentQuantity ?? '—',
  },
]

const pendingColumns = (
  t: (key: string) => string,
): ColumnsType<ReviewView['pending'][number]> => [
  // Identity + unit only: the ReviewView type cannot carry quantities, so the
  // pending projection cannot leak them even by accident.
  { title: t('capture.sku'), dataIndex: 'code', key: 'code' },
  { title: t('capture.description'), dataIndex: 'name', key: 'name' },
  { title: t('capture.unit'), dataIndex: 'unit', key: 'unit' },
]

/**
 * Counted/pending review with completeness gate. Finalize locks the attempt
 * into an immutable version; pending lines trigger the 422 confirm dialog.
 */
export function ReviewScreen({ attemptId }: { attemptId: string }) {
  const { t } = useTranslation()
  const { counted, pending, countedCount, total, isPending, isError } =
    useReview(attemptId)
  const {
    needsConfirm,
    isFinalizing,
    lockedVersion,
    finalizeError,
    finalize,
    confirm,
    cancel,
  } = useFinalize(attemptId)

  if (isPending) {
    return (
      <section aria-busy="true" className="flex w-full justify-center">
        <Card variant="borderless" className="flex w-full max-w-3xl flex-col gap-4 shadow-sm">
          <Typography.Title level={3} className="!mb-0">
            {t('review.title')}
          </Typography.Title>
          <div role="status">{t('app.loadingPlaceholder')}</div>
        </Card>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="flex w-full justify-center">
        <Card variant="borderless" className="flex w-full max-w-3xl flex-col gap-4 shadow-sm">
          <Typography.Title level={3} className="!mb-0">
            {t('review.title')}
          </Typography.Title>
          <Alert message={t('review.loadError')} role="alert" type="error" showIcon />
        </Card>
      </section>
    )
  }

  const locked = lockedVersion !== null

  return (
    <section className="flex w-full justify-center">
      <Card variant="borderless" className="flex w-full max-w-3xl flex-col gap-4 shadow-sm">
        <Typography.Title level={3} className="!mb-0 flex items-center gap-2">
          <FileDoneOutlined aria-hidden />
          {t('review.title')}
        </Typography.Title>
        <p className="text-on-surface-secondary m-0 text-sm">
          {t('review.completeness', { counted: countedCount, total })}
        </p>
        <section aria-label={t('review.counted')} className="flex flex-col gap-2">
          <Typography.Title level={5} className="!mb-0">
            {t('review.counted')}
          </Typography.Title>
          <div className="overflow-x-auto">
            <Table
              dataSource={counted}
              columns={countedColumns(t)}
              rowKey="code"
              pagination={false}
              size="small"
            />
          </div>
        </section>
        <Divider className="!my-0" />
        <section aria-label={t('review.pending')} className="flex flex-col gap-2">
          <Typography.Title level={5} className="!mb-0">
            {t('review.pending')}
          </Typography.Title>
          {pending.length === 0 ? (
            <p role="status" className="text-success m-0 text-sm">
              {t('review.emptyPending')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table
                dataSource={pending}
                columns={pendingColumns(t)}
                rowKey="code"
                pagination={false}
                size="small"
              />
            </div>
          )}
        </section>
        {locked ? (
          <Alert role="status" type="success" message={t('review.locked')} showIcon />
        ) : (
          <div>
            <Button
              type="primary"
              size="large"
              icon={<FileDoneOutlined aria-hidden />}
              onClick={finalize}
              loading={isFinalizing}
              disabled={isFinalizing}
            >
              {isFinalizing ? t('review.finalizing') : t('review.finalize')}
            </Button>
          </div>
        )}
        {finalizeError ? (
          <Alert role="alert" type="error" message={t('review.loadError')} showIcon />
        ) : null}
        <FinalizeDialog
          open={needsConfirm}
          pendingCount={pending.length}
          isConfirming={isFinalizing}
          onConfirm={confirm}
          onCancel={cancel}
        />
      </Card>
    </section>
  )
}
