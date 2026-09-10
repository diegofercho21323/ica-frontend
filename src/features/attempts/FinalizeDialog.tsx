import { Modal, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

type FinalizeDialogProps = {
  open: boolean
  pendingCount: number
  isConfirming: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 422 confirm dialog: finalizing with uncounted lines needs explicit consent. */
export function FinalizeDialog({
  open,
  pendingCount,
  isConfirming,
  onConfirm,
  onCancel,
}: FinalizeDialogProps) {
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      title={t('review.confirmTitle')}
      okText={t('review.confirm')}
      cancelText={t('review.cancel')}
      confirmLoading={isConfirming}
      onOk={onConfirm}
      onCancel={onCancel}
    >
      <Typography.Paragraph>
        {t('review.confirmMessage', { count: pendingCount })}
      </Typography.Paragraph>
    </Modal>
  )
}
