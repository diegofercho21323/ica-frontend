import { Drawer as AntDrawer } from 'antd'
import type { DrawerProps as AntDrawerProps } from 'antd'
import type { ReactNode } from 'react'

export type DrawerProps = Omit<AntDrawerProps, 'open' | 'onClose' | 'title'> & {
  open: boolean
  /** Translated drawer title (caller passes `t()` output); also the accessible name. */
  title: string
  /** Translated `aria-label` for the close control. */
  closeLabel: string
  onClose: () => void
  children?: ReactNode
}

/**
 * Themed drawer dialog primitive. Same dialog semantics as `Modal`: labelled by
 * its title, closes on `Esc`, on the scrim, and via the close control. Color,
 * radius, and focus ring resolve through `ConfigProvider` tokens — zero hex
 * here. No business logic.
 */
export function Drawer({ title, closeLabel, onClose, children, ...rest }: DrawerProps) {
  return (
    <AntDrawer
      keyboard
      maskClosable
      {...rest}
      title={title}
      closable={{ 'aria-label': closeLabel }}
      onClose={onClose}
    >
      {children}
    </AntDrawer>
  )
}
