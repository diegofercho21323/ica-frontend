export type LiveRegionProps = {
  /** Translated announcement (caller passes `t()` output). */
  message: string
  /** Urgent conflicts preempt; default saves stay polite. */
  assertive?: boolean
}

/**
 * Screen-reader announcer for save/submit/retry/conflict outcomes
 * (WCAG 4.1.3). Always mounted so rapid updates are never lost.
 */
export function LiveRegion({ message, assertive = false }: LiveRegionProps) {
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {message}
    </div>
  )
}
