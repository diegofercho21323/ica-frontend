import { HttpError } from './errors'
import { demoCredentials, operatorV2Fixture, scopeFixtures } from './fixtures'
import type { InventoryApiPort } from './port'
import type {
  Attempt,
  AttemptRecord,
  AttemptVersion,
  CaptureChange,
  DemoCredentials,
  DemoPreset,
  DemoRole,
  DemoSession,
  FinalizeOptions,
  OperatorLineView,
  Receipt,
  RecountInput,
  ReviewView,
} from './models'

// Attempt-scoped batch ledger: one fingerprint per `${attemptId}:${key}`.
// A repeated call with the same key and payload is a no-op success; the same
// key with a different payload is a conflict. `resetDemo` clears it.
const seenBatches = new Map<string, string>()

// PR1 attempt store: deterministic ids (`att-<n>-<scope>`), per-attempt lines,
// versioning, and the submission ledger live here. `resetDemo` clears all of it.
const attempts = new Map<string, AttemptRecord>()
const submissions = new Map<string, { payloadHash: string; receipt: Receipt }>()
const replacementKeys = new Set<string>()
let attemptSequence = 0
let replacementSequence = 0
let currentUserId = 'operator-1'
let currentRole: DemoRole = 'operator'

const seedLines = (): Map<string, OperatorLineView> =>
  new Map(operatorV2Fixture.map((line) => [line.code, { ...line }]))

const requireAttempt = (attemptId: string): AttemptRecord => {
  const record = attempts.get(attemptId)
  if (!record) {
    throw new HttpError(404, 'ATTEMPT_NOT_FOUND', `Unknown attempt ${attemptId}`)
  }
  return record
}

const erpPayload = (record: AttemptRecord): string => {
  // Submit carries no body: NOT_FOUND lines stay out of the ERP payload.
  const payload = [...record.lines.values()]
    .filter((line) => line.state !== 'NOT_FOUND')
    .map((line) => ({ code: line.code, state: line.state, quantity: line.currentQuantity }))
  return JSON.stringify(payload)
}

// Deterministic string hash (djb2 over char codes, no float coercion) so
// decimal-exact quantities hash identically on every run.
const hashPayload = (payload: string): string => {
  let hash = 5381
  for (let index = 0; index < payload.length; index += 1) {
    hash = ((hash << 5) + hash + payload.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

const mintAttempt = (scopeId: string, mode: Attempt['mode'], operatorId: string): AttemptRecord => {
  attemptSequence += 1
  const attempt: Attempt = {
    id: `att-${attemptSequence}-${scopeId}`,
    operatorId,
    scopeId,
    mode,
  }
  const record: AttemptRecord = {
    attempt,
    lines: seedLines(),
    versions: [],
    locked: false,
  }
  attempts.set(attempt.id, record)
  return record
}

const lockRecord = (record: AttemptRecord): AttemptVersion => {
  const version: AttemptVersion = {
    v: record.versions.length + 1,
    lockedAt: new Date().toISOString(),
    lineCount: record.lines.size,
  }
  record.versions.push(version)
  record.locked = true
  return { ...version }
}

export const mockInventoryApi: InventoryApiPort = {
  async loginDemo(credentials: DemoCredentials): Promise<DemoSession> {
    const account = demoCredentials.find((candidate) => {
      return (
        candidate.username === credentials.username &&
        candidate.password === credentials.password
      )
    })
    if (!account) throw new Error('Invalid demo credentials')
    currentUserId = account.userId
    currentRole = account.role
    return {
      userId: account.userId,
      displayName: account.displayName,
      role: account.role,
    }
  },
  async listScopes() {
    return scopeFixtures.map((scope) => ({ ...scope }))
  },
  async startAttempt(scopeId: string, mode: Attempt['mode']) {
    const scope = scopeFixtures.find((candidate) => candidate.id === scopeId)
    if (!scope) {
      throw new HttpError(404, 'SCOPE_NOT_FOUND', `Unknown scope ${scopeId}`)
    }
    return { ...mintAttempt(scopeId, mode, currentUserId).attempt }
  },
  async getOperatorLines(attemptId: string) {
    const record = requireAttempt(attemptId)
    return [...record.lines.values()].map((line) => ({ ...line }))
  },
  async saveBatch(attemptId: string, idempotencyKey: string, changes: CaptureChange[]) {
    const record = requireAttempt(attemptId)
    if (record.locked) {
      throw new HttpError(409, 'ATTEMPT_LOCKED', `Attempt ${attemptId} is locked`)
    }
    const fingerprint = JSON.stringify(changes)
    const ledgerKey = `${attemptId}:${idempotencyKey}`
    const seen = seenBatches.get(ledgerKey)
    if (seen !== undefined) {
      if (seen !== fingerprint) {
        throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key reuse with a different payload')
      }
      return
    }
    seenBatches.set(ledgerKey, fingerprint)
    for (const change of changes) {
      const line = record.lines.get(change.lineCode)
      if (line) {
        record.lines.set(change.lineCode, {
          ...line,
          state: change.state,
          currentQuantity: change.quantity,
        })
      }
    }
  },
  async getReview(attemptId: string): Promise<ReviewView> {
    const record = requireAttempt(attemptId)
    const counted: OperatorLineView[] = []
    const pending: ReviewView['pending'] = []
    for (const line of record.lines.values()) {
      if (line.state === 'NOT_COUNTED') {
        pending.push({ code: line.code, name: line.name, unit: line.unit })
      } else {
        counted.push({ ...line })
      }
    }
    return { attemptId, counted, pending }
  },
  async finalize(attemptId: string, options?: FinalizeOptions) {
    const record = requireAttempt(attemptId)
    if (record.locked) return { ...record.versions[record.versions.length - 1] }
    const pending = [...record.lines.values()].filter(
      (line) => line.state === 'NOT_COUNTED',
    )
    if (pending.length > 0 && options?.confirm_uncounted !== true) {
      throw new HttpError(
        422,
        'PENDING_LINES_EXIST',
        `${pending.length} line(s) still uncounted`,
      )
    }
    return lockRecord(record)
  },
  async submit(attemptId: string, idempotencyKey: string) {
    const record = requireAttempt(attemptId)
    if (!record.locked) {
      throw new HttpError(422, 'ATTEMPT_NOT_LOCKED', `Attempt ${attemptId} is not finalized`)
    }
    const payloadHash = hashPayload(erpPayload(record))
    const seen = submissions.get(idempotencyKey)
    if (seen) {
      if (seen.payloadHash !== payloadHash) {
        throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key reuse with a different payload')
      }
      return { ...seen.receipt }
    }
    const receipt: Receipt = {
      key: idempotencyKey,
      status: 'SUCCEEDED',
      payload_hash: payloadHash,
      erp_reference: `erp-${attemptId}-v${record.versions.length}`,
    }
    submissions.set(idempotencyKey, { payloadHash, receipt })
    const latest = record.versions[record.versions.length - 1]
    if (latest) latest.submission = { ...receipt }
    return { ...receipt }
  },
  async getHistory(attemptId: string) {
    const record = requireAttempt(attemptId)
    return [...record.versions].reverse().map((version) => ({
      ...version,
      submission: version.submission ? { ...version.submission } : undefined,
    }))
  },
  async createRecount(attemptId: string, input: RecountInput) {
    const parent = requireAttempt(attemptId)
    if (currentRole !== 'cost-leader') {
      throw new HttpError(403, 'FORBIDDEN', 'Recount requires the cost-leader role')
    }
    const selected = input.lineCodes.filter((code) => parent.lines.has(code))
    if (selected.length === 0) {
      throw new HttpError(400, 'EMPTY_RECOUNT_SELECTION', 'Recount needs at least one line')
    }
    const child = mintAttempt(parent.attempt.scopeId, parent.attempt.mode, input.assignee)
    child.lines.clear()
    for (const code of selected) {
      const parentLine = parent.lines.get(code)
      if (!parentLine) continue
      // Blind subset: identity+unit only, quantities restart empty.
      child.lines.set(code, {
        code: parentLine.code,
        name: parentLine.name,
        unit: parentLine.unit,
        state: 'NOT_COUNTED',
        currentQuantity: null,
      })
    }
    return { ...child.attempt }
  },
  async loadPreset(preset: DemoPreset) {
    await mockInventoryApi.resetDemo()
    if (preset === 'open-count') {
      mintAttempt('scope-centro', 'guided', currentUserId)
      return
    }
    const attempt = mintAttempt('scope-centro', 'guided', currentUserId).attempt
    const record = requireAttempt(attempt.id)
    lockRecord(record)
    if (preset === 'retry') {
      const payloadHash = hashPayload(erpPayload(record))
      const receipt: Receipt = {
        key: 'retry-key',
        status: 'FAILED',
        payload_hash: payloadHash,
        erp_reference: null,
      }
      submissions.set(receipt.key, { payloadHash, receipt })
      const latest = record.versions[record.versions.length - 1]
      if (latest) latest.submission = { ...receipt }
      return
    }
    if (preset === 'blind-v2') {
      const previousRole = currentRole
      currentRole = 'cost-leader'
      try {
        await mockInventoryApi.createRecount(attempt.id, {
          lineCodes: ['SKU-001'],
          assignee: 'operator-1',
        })
      } finally {
        currentRole = previousRole
      }
    }
  },
  async resetDemo() {
    seenBatches.clear()
    attempts.clear()
    submissions.clear()
    replacementKeys.clear()
    attemptSequence = 0
    replacementSequence = 0
    currentUserId = 'operator-1'
    currentRole = 'operator'
  },
  async authorizeReplacementKey(idempotencyKey: string) {
    if (!submissions.has(idempotencyKey)) {
      throw new HttpError(404, 'SUBMISSION_NOT_FOUND', `Unknown submission key ${idempotencyKey}`)
    }
    replacementSequence += 1
    const replacement = `${idempotencyKey}-replacement-${replacementSequence}`
    replacementKeys.add(replacement)
    return replacement
  },
}
