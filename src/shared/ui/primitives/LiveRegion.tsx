export type LiveRegionProps = {
  /** Translated announcement (caller passes `t()` output). */
  message: string
  /** Urgent conflicts preempt; default saves stay polite. */
  assertive?: boolean
}

/**
 * Screen-reader announcer for save/submit/retry/conflict outcomes
 * (WCAG 4.1.3). Always mounted so rapid updates are never lost. Visually
 * hidden (`sr-only`) — the announcement text is redundant with a visible
 * label elsewhere on screen; this is the assistive-tech channel only.
 */
export function LiveRegion({ message, assertive = false }: LiveRegionProps) {
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
