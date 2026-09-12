import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInventoryApi } from '../../../shared/api/inventory/api-context'
import { HttpError } from '../../../shared/api/inventory/errors'
import type {
  CaptureChange,
  OperatorLineView,
} from '../../../shared/api/inventory/models'
import {
  createIdempotencyRegistry,
  type IdempotencyKeyStore,
} from '../../../shared/lib/idempotency'
import { buildChangeInput, buildConfirmChange } from '../change-input'
import { QTY_RE } from '../validation'

export { buildConfirmChange } from '../change-input'

export type CaptureMethod = 'keyboard' | 'stepper' | 'manual' | 'barcode' | 'voice-demo'
export type GuidedMode = 'guided' | 'manual'
export type GuidedFieldError = 'invalid' | 'required' | 'unit-mismatch' | null
export type GuidedNotice = 'saved' | 'confirm-required' | 'save-error' | null
export type ShortcutAction = 'save' | 'prev' | 'next' | 'search' | 'close'

export type PendingConfirm = {
  lineCode: string
  /** Exact-decimal string, held verbatim for the confirm resend. */
  quantity: string
  captureMethod: CaptureMethod
}

function memoryKeyStore(): IdempotencyKeyStore {
  const store = new Map<string, string>()
  return {
    get: (key) => Promise.resolve(store.get(key)),
    set: (key, value) => {
      store.set(key, value)
      return Promise.resolve()
    },
    del: (key) => {
      store.delete(key)
      return Promise.resolve()
    },
  }
}

/**
 * Keyboard map for the capture loop. In-field editing is never hijacked:
 * arrows keep moving the caret and only `Enter` (save) plus `Esc` (close)
 * act inside inputs. `Ctrl+K` carries no text-editing meaning, so search
 * fires everywhere.
 */
export function resolveShortcut(
  key: string,
  opts: { ctrlKey: boolean; inField: boolean },
): ShortcutAction | null {
  if (key === 'Escape') return 'close'
  if (opts.ctrlKey && (key === 'k' || key === 'K')) return 'search'
  if (key === 'Enter') return 'save'
  if (opts.inField) return null
  if (key === 'ArrowUp' || key === 'ArrowLeft') return 'prev'
  if (key === 'ArrowDown' || key === 'ArrowRight') return 'next'
  return null
}

/** Counted-vs-pending counts only — quantities must never enter progress. */
export function getProgress(lines: readonly OperatorLineView[]): {
  counted: number
  total: number
} {
  return {
    counted: lines.filter((line) => line.state !== 'NOT_COUNTED').length,
    total: lines.length,
  }
}

/** First pending index at/after `from`, wrapping to the head; -1 when done. */
export function getNextPendingIndex(
  lines: readonly OperatorLineView[],
  from: number,
): number {
  for (let index = from; index < lines.length; index += 1) {
    if (lines[index].state === 'NOT_COUNTED') return index
  }
  for (let index = 0; index < Math.min(from, lines.length); index += 1) {
    if (lines[index].state === 'NOT_COUNTED') return index
  }
  return -1
}

/** Blind pending lookup: identities + units only, zero quantities. */
export function getPendingIdentities(
  lines: readonly OperatorLineView[],
): Pick<OperatorLineView, 'code' | 'name' | 'unit'>[] {
  return lines
    .filter((line) => line.state === 'NOT_COUNTED')
    .map(({ code, name, unit }) => ({ code, name, unit }))
}

export type SaveCurrentInput = {
  /** Exact-decimal contract string; never coerced to number. */
  quantity: string
  /** Must equal the authoritative line unit or the save is blocked inline. */
  unit: string
  captureMethod: CaptureMethod
}

/**
 * Guided/manual capture state for one attempt. Guided opens on the first
 * pending line and auto-advances past each save while history stays editable
 * via `selectLine`; manual opens empty until search/scan picks a line.
 * Advisory `422 UNUSUAL_QUANTITY` parks the identical string in
 * `pendingConfirm` until `confirmUnusual` resends it with the flag on.
 */
export function useGuidedCapture(attemptId: string, mode: GuidedMode) {
  const api = useInventoryApi()
  const queryClient = useQueryClient()
  const registry = useMemo(
    () => createIdempotencyRegistry(memoryKeyStore()),
    [],
  )
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [fieldError, setFieldError] = useState<GuidedFieldError>(null)
  const [notice, setNotice] = useState<GuidedNotice>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const initialized = useRef(false)

  const linesQuery = useQuery({
    queryKey: ['capture-lines', attemptId],
    queryFn: () => api.getOperatorLines(attemptId),
  })
  const lines = linesQuery.data ?? []

  useEffect(() => {
    if (initialized.current || linesQuery.data === undefined) return
    initialized.current = true
    if (mode === 'guided') {
      const next = getNextPendingIndex(linesQuery.data, 0)
      setSelectedCode(next === -1 ? null : linesQuery.data[next].code)
    }
  }, [linesQuery.data, mode])

  const current = lines.find((line) => line.code === selectedCode) ?? null

  const advanceAfterSave = (savedCode: string, snapshot: readonly OperatorLineView[]) => {
    const projected = snapshot.map((line) =>
      line.code === savedCode ? { ...line, state: 'COUNTED' as const } : line,
    )
    const savedIndex = projected.findIndex((line) => line.code === savedCode)
    const nextIndex = getNextPendingIndex(projected, savedIndex + 1)
    if (nextIndex !== -1) setSelectedCode(projected[nextIndex].code)
  }

  const mutation = useMutation({
    mutationFn: (input: { key: string; changes: CaptureChange[]; confirm: boolean }) =>
      api.saveBatch(attemptId, input.key, input.changes),
    onSuccess: (_, input) => {
      if (input.confirm) setPendingConfirm(null)
      setFieldError(null)
      setNotice('saved')
      if (mode === 'guided' && input.changes.length > 0) {
        advanceAfterSave(input.changes[0].lineCode, linesQuery.data ?? [])
      }
    },
    onError: (error, input) => {
      if (error instanceof HttpError && error.status === 422 && !input.confirm) {
        const change = input.changes[0]
        setPendingConfirm({
          lineCode: change.lineCode,
          quantity: change.quantity ?? '',
          captureMethod: (change.captureMethod as CaptureMethod | undefined) ?? 'keyboard',
        })
        setNotice('confirm-required')
        return
      }
      setNotice('save-error')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['capture-lines', attemptId] })
    },
  })

  const selectLine = (code: string) => {
    setSelectedCode(code)
    setFieldError(null)
    setNotice(null)
  }

  const goTo = (index: number) => {
    if (lines.length === 0) return
    const wrapped = ((index % lines.length) + lines.length) % lines.length
    selectLine(lines[wrapped].code)
  }
  const currentIndex = lines.findIndex((line) => line.code === selectedCode)
  const next = () => goTo(currentIndex + 1)
  const prev = () => goTo(currentIndex - 1)

  const saveCurrent = (input: SaveCurrentInput) => {
    if (!current) return
    if (input.unit !== current.unit) {
      // Contract-exact unit: blocked inline and excluded from the batch.
      setFieldError('unit-mismatch')
      return
    }
    if (input.quantity === '') {
      setFieldError('required')
      return
    }
    if (!QTY_RE.test(input.quantity)) {
      setFieldError('invalid')
      return
    }
    setFieldError(null)
    const changes: CaptureChange[] = [
      buildChangeInput(current, {
        quantity: input.quantity,
        captureMethod: input.captureMethod,
      }),
    ]
    void registry
      .getKey('guided.saveBatch', JSON.stringify(changes))
      .then((key) => mutation.mutate({ key, changes, confirm: false }))
  }

  const confirmUnusual = () => {
    if (!pendingConfirm) return
    const line = lines.find((candidate) => candidate.code === pendingConfirm.lineCode)
    if (!line) return
    const changes: CaptureChange[] = [
      buildConfirmChange(line, pendingConfirm.quantity, pendingConfirm.captureMethod),
    ]
    // Different payload (flag on) mints a fresh key: reusing the first key
    // with a different body would be a 409 idempotency conflict.
    void registry
      .getKey('guided.saveBatch', JSON.stringify(changes))
      .then((key) => mutation.mutate({ key, changes, confirm: true }))
  }

  const dismissConfirm = () => {
    setPendingConfirm(null)
    setNotice(null)
  }

  return {
    lines,
    isPending: linesQuery.isPending,
    isSaving: mutation.isPending,
    current,
    progress: getProgress(lines),
    pending: getPendingIdentities(lines),
    fieldError,
    notice,
    pendingConfirm,
    searchOpen,
    setSearchOpen,
    selectLine,
    next,
    prev,
    saveCurrent,
    confirmUnusual,
    dismissConfirm,
  }
}
