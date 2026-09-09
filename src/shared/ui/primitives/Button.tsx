import { Button as AntButton } from 'antd'
import type { ButtonProps as AntButtonProps } from 'antd'

export type ButtonProps = Omit<AntButtonProps, 'loading'> & {
  /** Spoken label while busy; defaults to the visible children. */
  loadingLabel?: string
  loading?: boolean
}

/**
 * Themed button primitive. AntD resolves color, radius, and focus ring
 * through `ConfigProvider` semantic tokens — this file carries zero hex.
 * Minimum 24px target (WCAG 2.5.8); icon-only use requires `aria-label`.
 */
export function Button({ loadingLabel, ...props }: ButtonProps) {
  const { children, loading } = props
  return (
    <AntButton
      aria-busy={loading || undefined}
      aria-label={props['aria-label']}
      {...props}
      className={['min-h-6 min-w-6', props.className].filter(Boolean).join(' ')}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </AntButton>
  )
}
