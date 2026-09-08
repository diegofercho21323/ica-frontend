import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { mockInventoryApi } from '../../shared/api/inventory/mock'
import type { CaptureChange } from '../../shared/api/inventory/models'
import {
  createIdempotencyRegistry,
  type IdempotencyKeyStore,
} from '../../shared/lib/idempotency'
import { QTY_RE, toPayloadQty, type RowState } from './validation'

export type CaptureRowForm = {
  code: string
  name: string
  systemQty: string | null
  qty: string
  state: RowState
  dirty: boolean
  error?: string
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

const needsQty = (state: RowState) => state === 'COUNTED'

/**
 * Blind-capture form state. Every row starts NOT_COUNTED with an empty
 * quantity input; the system quantity stays hidden until the row leaves
 * NOT_COUNTED. One idempotency key is minted per batch through the shared
 * registry, so a retry without edits reuses the same key.
 */
export function useCaptureForm() {
  const { t } = useTranslation()
  const registry = useMemo(
    () => createIdempotencyRegistry(memoryKeyStore()),
    [],
  )
  const keyRef = useRef<string | null>(null)
  const [forms, setForms] = useState<CaptureRowForm[] | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const linesQuery = useQuery({
    queryKey: ['capture-lines'],
    queryFn: () => mockInventoryApi.getOperatorLines('capture'),
  })

  useEffect(() => {
    if (forms === null && linesQuery.data !== undefined) {
      setForms(
        linesQuery.data.map((line) => ({
          code: line.code,
          name: line.name,
          systemQty: line.currentQuantity,
          qty: '',
          state: 'NOT_COUNTED' as RowState,
          dirty: false,
        })),
      )
    }
  }, [forms, linesQuery.data])

  const setQty = (code: string, value: string) => {
    setSaveSuccess(false)
    setForms((prev) =>
      (prev ?? []).map((row) => {
        if (row.code !== code) return row
        const invalid = value !== '' && !QTY_RE.test(value)
        return {
          ...row,
          qty: value,
          dirty: true,
          error: invalid ? t('capture.invalidQuantity') : undefined,
        }
      }),
    )
  }

  const setState = (code: string, state: RowState) => {
    setSaveSuccess(false)
    setForms((prev) =>
      (prev ?? []).map((row) => {
        if (row.code !== code) return row
        return {
          ...row,
          state,
          dirty: true,
          // Quantity only matters for COUNTED rows; other states clear the
          // input error because the payload no longer depends on it.
          error: needsQty(state) ? row.error : undefined,
        }
      }),
    )
  }

  const mutation = useMutation({
    mutationFn: (input: { key: string; changes: CaptureChange[] }) =>
      mockInventoryApi.saveBatch(input.key, input.changes),
    onSuccess: (_, input) => {
      const saved = new Set(input.changes.map((change) => change.lineCode))
      setForms((prev) =>
        (prev ?? []).map((row) =>
          saved.has(row.code) ? { ...row, dirty: false } : row,
        ),
      )
      setSaveError(null)
      setSaveSuccess(true)
    },
    onError: () => {
      setSaveSuccess(false)
      setSaveError(t('capture.saveError'))
    },
  })

  const submit = async () => {
    const current = forms ?? []
    const marked = current.map((row) => {
      if (
        row.dirty &&
        row.error === undefined &&
        row.state === 'COUNTED' &&
        row.qty === ''
      ) {
        return { ...row, error: t('capture.quantityRequired') }
      }
      return row
    })
    setForms(marked)
    // Invalid rows are excluded from the batch until fixed; valid dirty
    // rows still save.
    const eligible = marked.filter(
      (row) =>
        row.dirty &&
        row.error === undefined &&
        row.state !== 'NOT_COUNTED' &&
        !(row.state === 'COUNTED' && row.qty === ''),
    )
    if (eligible.length === 0) return
    const changes: CaptureChange[] = eligible.map((row) => ({
      lineCode: row.code,
      quantity: toPayloadQty(row.state, row.qty),
      state: row.state,
    }))
    const key = await registry.getKey(
      'capture.saveBatch',
      JSON.stringify(changes),
    )
    keyRef.current = key
    mutation.mutate({ key, changes })
  }

  const rows = forms ?? []
  return {
    rows,
    isPending: linesQuery.isPending || forms === null,
    isSaving: mutation.isPending,
    saveError,
    saveSuccess,
    dirtyCount: rows.filter((row) => row.dirty).length,
    lastKey: keyRef.current,
    setQty,
    setState,
    submit: () => void submit(),
  }
}
