/**
 * Blind-safe, non-blocking operational telemetry (product-telemetry spec).
 *
 * Records focus-to-save timing, unit-error counts, and retry/replay counts
 * per attempt, exposed only as aggregates (median/p90, running totals) —
 * never a raw per-event log a consumer would have to reduce themselves.
 *
 * Blind-safety, hard requirement: every public shape this module returns is
 * a fixed, closed set of fields. No field of any kind can ever carry a
 * counted value the operator entered, a derived stock figure, a prior
 * count, or a variance — see `telemetry.test.ts` for the structural proof.
 *
 * Non-blocking by construction: every record* function is synchronous,
 * returns `void`, never touches the network, and never throws — so a
 * telemetry call can never fail the save or retry path it is attached to.
 */

const MAX_SAMPLES_PER_ATTEMPT = 200

type AttemptTelemetryState = {
  focusToSaveDurationsMs: number[]
  unitErrorCount: number
  retryCount: number
}

const attempts = new Map<string, AttemptTelemetryState>()

function stateFor(attemptId: string): AttemptTelemetryState {
  let state = attempts.get(attemptId)
  if (!state) {
    state = { focusToSaveDurationsMs: [], unitErrorCount: 0, retryCount: 0 }
    attempts.set(attemptId, state)
  }
  return state
}

/** Swallows any internal error so telemetry can never break its caller. */
function safely(action: () => void): void {
  try {
    action()
  } catch {
    // Telemetry must never surface a failure to the save/retry path.
  }
}

function percentile(sortedAscending: readonly number[], rankPercent: number): number | null {
  if (sortedAscending.length === 0) return null
  const rank = (rankPercent / 100) * (sortedAscending.length - 1)
  const lowerIndex = Math.floor(rank)
  const upperIndex = Math.ceil(rank)
  if (lowerIndex === upperIndex) return sortedAscending[lowerIndex]
  const weight = rank - lowerIndex
  return (
    sortedAscending[lowerIndex] +
    (sortedAscending[upperIndex] - sortedAscending[lowerIndex]) * weight
  )
}

export type FocusToSaveAggregate = {
  sampleCount: number
  medianMs: number | null
  p90Ms: number | null
}

export type AttemptTelemetrySnapshot = {
  attemptId: string
  focusToSave: FocusToSaveAggregate
  unitErrorCount: number
  retryCount: number
}

/** Records one focus-to-save duration sample for an attempt's aggregate. */
export function recordFocusToSaveDuration(attemptId: string, durationMs: number): void {
  safely(() => {
    if (!Number.isFinite(durationMs) || durationMs < 0) return
    const state = stateFor(attemptId)
    state.focusToSaveDurationsMs.push(durationMs)
    if (state.focusToSaveDurationsMs.length > MAX_SAMPLES_PER_ATTEMPT) {
      state.focusToSaveDurationsMs.shift()
    }
  })
}

/** Reuses the existing `unit-mismatch` field-error concept — count only. */
export function recordUnitError(attemptId: string): void {
  safely(() => {
    stateFor(attemptId).unitErrorCount += 1
  })
}

/** One retry or replay attempt, from the queue/outbox retry paths. */
export function recordRetry(attemptId: string): void {
  safely(() => {
    stateFor(attemptId).retryCount += 1
  })
}

/** Reads the current aggregate for an attempt; never throws, never null. */
export function getAttemptTelemetry(attemptId: string): AttemptTelemetrySnapshot {
  const state = attempts.get(attemptId)
  const sortedDurations = state
    ? [...state.focusToSaveDurationsMs].sort((left, right) => left - right)
    : []
  return {
    attemptId,
    focusToSave: {
      sampleCount: sortedDurations.length,
      medianMs: percentile(sortedDurations, 50),
      p90Ms: percentile(sortedDurations, 90),
    },
    unitErrorCount: state?.unitErrorCount ?? 0,
    retryCount: state?.retryCount ?? 0,
  }
}

/** Test-only reset so specs stay isolated without reaching module-private state. */
export function __resetTelemetryForTests(): void {
  attempts.clear()
}
