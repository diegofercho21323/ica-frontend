import { Alert, Button, Input, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { useCaptureForm, type CaptureRowForm } from './useCaptureForm'
import type { RowState } from './validation'

const STATE_ORDER: readonly RowState[] = [
  'COUNTED',
  'COUNTED_ZERO',
  'NOT_FOUND',
  'NOT_COUNTED',
]

const stateKey: Record<RowState, string> = {
  COUNTED: 'capture.states.counted',
  COUNTED_ZERO: 'capture.states.countedZero',
  NOT_FOUND: 'capture.states.notFound',
  NOT_COUNTED: 'capture.states.notCounted',
}

/**
 * Blind-count capture table. Quantities are exact-decimal strings edited
 * through text inputs with decimal keyboards; the system quantity stays
 * hidden from the operator — the system column always renders "Oculta"
 * unless `showSystemQuantity` is set (reserved for a future auditor/leader
 * view). Dirty, valid rows batch-save with one idempotency key. A locked
 * attempt renders read-only.
 */
export function CaptureTable({
  attemptId,
  showSystemQuantity = false,
}: {
  attemptId?: string
  showSystemQuantity?: boolean
}) {
  const { t } = useTranslation()
  const {
    rows,
    isPending,
    isSaving,
    locked,
    saveError,
    saveSuccess,
    dirtyCount,
    setQty,
    setState,
    submit,
  } = useCaptureForm(attemptId)

  const columns: ColumnsType<CaptureRowForm> = [
    {
      title: t('capture.sku'),
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: t('capture.description'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('capture.systemQuantity'),
      key: 'systemQuantity',
      render: (_, row) =>
        showSystemQuantity && row.state !== 'NOT_COUNTED'
          ? (row.systemQty ?? '—')
          : t('capture.hidden'),
    },
    {
      title: t('capture.quantity'),
      key: 'quantity',
      render: (_, row) => (
        <div>
          <Input
            aria-label={`${t('capture.quantity')} ${row.code}`}
            inputMode="decimal"
            autoComplete="off"
            value={row.qty}
            disabled={locked}
            status={row.error ? 'error' : undefined}
            onChange={(event) => setQty(row.code, event.target.value)}
          />
          {row.error ? (
            <div className="mt-1 text-xs text-red-600">{row.error}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: t('capture.state'),
      key: 'state',
      render: (_, row) => (
        <Select
          aria-label={`${t('capture.state')} ${row.code}`}
          value={row.state}
          disabled={locked}
          style={{ minWidth: 160 }}
          onChange={(value: RowState) => setState(row.code, value)}
          options={STATE_ORDER.map((state) => ({
            value: state,
            label: t(stateKey[state]),
          }))}
        />
      ),
    },
  ]

  return (
    <section aria-busy={isSaving} className="flex flex-col gap-4 pt-2">
      <Typography.Title level={2}>{t('capture.title')}</Typography.Title>
      <div className="overflow-x-auto">
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="code"
          pagination={false}
          loading={isPending}
          scroll={{ x: true }}
        />
      </div>
      {locked ? (
        <Alert role="status" type="info" message={t('capture.lockedNotice')} />
      ) : null}
      {saveError ? (
        <Alert
          role="alert"
          type="error"
          message={saveError}
          action={
            <Button size="small" danger onClick={submit} disabled={isSaving}>
              {t('capture.retry')}
            </Button>
          }
        />
      ) : null}
      {saveSuccess ? (
        <Alert role="status" type="success" message={t('capture.saveSuccess')} />
      ) : null}
      <div>
        <Button
          type="primary"
          onClick={submit}
          loading={isSaving}
          disabled={locked || isSaving || dirtyCount === 0}
        >
          {isSaving ? t('capture.saving') : t('capture.save')}
        </Button>
      </div>
    </section>
  )
}
