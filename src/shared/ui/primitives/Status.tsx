import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { Typography } from 'antd'

export type StatusTone = 'success' | 'warning' | 'error'

const TONE_ICON = {
  success: CheckCircleOutlined,
  warning: ExclamationCircleOutlined,
  error: CloseCircleOutlined,
} as const

const TONE_TEXT_TYPE = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
} as const

export type StatusProps = {
  tone: StatusTone
  /** Translated label (caller passes `t()` output); icon never stands alone. */
  label: string
}

/**
 * Queue/entity state badge. Text + icon always (never color-only, WCAG 1.4.1);
 * color resolves through AntD text-type tokens — zero hardcoded hex here.
 */
export function Status({ tone, label }: StatusProps) {
  const Icon = TONE_ICON[tone]
  return (
    <Typography.Text type={TONE_TEXT_TYPE[tone]} role="status">
      <Icon aria-hidden="true" /> {label}
    </Typography.Text>
  )
}
