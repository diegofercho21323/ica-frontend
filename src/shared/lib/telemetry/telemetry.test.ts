import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetTelemetryForTests,
  getAttemptTelemetry,
  recordFocusToSaveDuration,
  recordRetry,
  recordUnitError,
} from './telemetry'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Strips comments before scanning so doc comments are free to *discuss* the
 * blind-safety invariant in prose without tripping the same guard that
 * enforces it in code — only actual declarations/keys can fail this check.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

// Any field name that could carry a counted value the operator entered or a
// derived stock/variance figure. Structural — this list is the whole guard.
const BANNED_FIELD_TOKENS = [
  'quantity',
  'qty',
  'stock',
  'priorcount',
  'prior_count',
  'variance',
  'theoreticalstock',
  'theoretical_stock',
  'price',
]

/** Recursively collects every own key name of a value, including arrays. */
function collectKeys(value: unknown, acc: Set<string> = new Set()): Set<string> {
  if (value === null || typeof value !== 'object') return acc
  for (const [key, nested] of Object.entries(value)) {
    acc.add(key.toLowerCase())
    collectKeys(nested, acc)
  }
  return acc
}

describe('telemetry blind-safety (F5-PR3)', () => {
  beforeEach(() => {
    __resetTelemetryForTests()
  })

  it('carries no quantity/stock/priorCount/variance field in its production source', () => {
    const source = stripComments(readFileSync(join(here, 'telemetry.ts'), 'utf8'))
    for (const token of BANNED_FIELD_TOKENS) {
      expect(source.toLowerCase()).not.toContain(token)
    }
  })

  it('never carries a banned key in the actual runtime payload shape, structurally', () => {
    recordFocusToSaveDuration('att-1', 1200)
    recordUnitError('att-1')
    recordRetry('att-1')
    const snapshot = getAttemptTelemetry('att-1')
    const keys = collectKeys(snapshot)
    for (const token of BANNED_FIELD_TOKENS) {
      expect([...keys].some((key) => key.includes(token))).toBe(false)
    }
    // Closed, explicit shape — not "we didn't populate it this time".
    expect(Object.keys(snapshot).sort()).toEqual(
      ['attemptId', 'focusToSave', 'retryCount', 'unitErrorCount'].sort(),
    )
    expect(Object.keys(snapshot.focusToSave).sort()).toEqual(
      ['medianMs', 'p90Ms', 'sampleCount'].sort(),
    )
  })

  it('exposes focus-to-save as a median/p90 aggregate, never a raw sample array', () => {
    for (const duration of [100, 200, 300, 400, 500]) {
      recordFocusToSaveDuration('att-2', duration)
    }
    const snapshot = getAttemptTelemetry('att-2')
    expect(snapshot.focusToSave.sampleCount).toBe(5)
    expect(snapshot.focusToSave.medianMs).toBe(300)
    expect(snapshot.focusToSave.p90Ms).toBe(460)
    expect(Array.isArray(snapshot.focusToSave)).toBe(false)
  })

  it('reports null aggregates for an attempt with zero samples, without throwing', () => {
    const snapshot = getAttemptTelemetry('att-never-seen')
    expect(snapshot).toEqual({
      attemptId: 'att-never-seen',
      focusToSave: { sampleCount: 0, medianMs: null, p90Ms: null },
      unitErrorCount: 0,
      retryCount: 0,
    })
  })

  it('keeps each attempt aggregate isolated from every other attempt', () => {
    recordFocusToSaveDuration('att-a', 1000)
    recordUnitError('att-a')
    recordUnitError('att-b')
    recordRetry('att-b')
    const a = getAttemptTelemetry('att-a')
    const b = getAttemptTelemetry('att-b')
    expect(a.unitErrorCount).toBe(1)
    expect(a.retryCount).toBe(0)
    expect(a.focusToSave.sampleCount).toBe(1)
    expect(b.unitErrorCount).toBe(1)
    expect(b.retryCount).toBe(1)
    expect(b.focusToSave.sampleCount).toBe(0)
  })

  it('counts repeated unit-error and retry events independently, per attempt', () => {
    recordUnitError('att-3')
    recordUnitError('att-3')
    recordUnitError('att-3')
    recordRetry('att-3')
    recordRetry('att-3')
    const snapshot = getAttemptTelemetry('att-3')
    expect(snapshot.unitErrorCount).toBe(3)
    expect(snapshot.retryCount).toBe(2)
  })

  it('never throws and never records a sample for a non-finite or negative duration', () => {
    expect(() => recordFocusToSaveDuration('att-4', Number.NaN)).not.toThrow()
    expect(() => recordFocusToSaveDuration('att-4', Number.POSITIVE_INFINITY)).not.toThrow()
    expect(() => recordFocusToSaveDuration('att-4', -50)).not.toThrow()
    const snapshot = getAttemptTelemetry('att-4')
    expect(snapshot.focusToSave.sampleCount).toBe(0)
    expect(snapshot.focusToSave.medianMs).toBeNull()
  })

  it('is fire-and-forget: recording functions return void, never a Promise to await', () => {
    const focusResult = recordFocusToSaveDuration('att-5', 10)
    const errorResult = recordUnitError('att-5')
    const retryResult = recordRetry('att-5')
    expect(focusResult).toBeUndefined()
    expect(errorResult).toBeUndefined()
    expect(retryResult).toBeUndefined()
  })
})
