import { Modal as AntModal } from 'antd'
import type { ModalProps as AntModalProps } from 'antd'
import type { ReactNode } from 'react'

export type ModalProps = Omit<AntModalProps, 'open' | 'onCancel' | 'title'> & {
  open: boolean
  /** Translated dialog title (caller passes `t()` output); also the accessible name. */
  title: string
  /** Translated `aria-label` for the close control. */
  closeLabel: string
  onClose: () => void
  children?: ReactNode
}

/**
 * Themed modal dialog primitive. AntD traps focus while open and restores it to
 * the trigger on close; `Esc`, the scrim, and the close control all call
 * `onClose`. Color, radius, and focus ring resolve through `ConfigProvider`
 * tokens — this file carries zero hex. No business logic.
 */
export function Modal({ title, closeLabel, onClose, children, ...rest }: ModalProps) {
  return (
    <AntModal
      keyboard
      maskClosable
      {...rest}
      title={title}
      closable={{ 'aria-label': closeLabel }}
      onCancel={onClose}
    >
      {children}
    </AntModal>
  )
}
