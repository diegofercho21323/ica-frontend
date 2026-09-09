import axios from 'axios'
import {
  AUTH_TOKEN_TTL_MS,
  authTokenStorage,
  type AuthTokenStore,
} from '../../lib/auth-token'
import { HttpError, type ErrorCode, type HttpStatus } from './errors'
import type {
  AttemptMode,
  CaptureChange,
  DemoRole,
  DemoSession,
  Receipt,
} from './models'
import type { InventoryApiPort } from './port'

// Progressive HTTP adapter (F2 slice 1). No backend URL/CORS/auth contract is
// published yet (GAP-4), so the adapter stays disabled unless
// VITE_INVENTORY_API_URL is set — never a hardcoded URL. Only PRD App. A
// paths are wired (auth/token, auth/me, lines:batch); the rest keep the
// disabled message until their gates land. Quantities stay exact strings.
export const HTTP_DISABLED_MESSAGE =
  'HTTP inventory adapter is disabled: set VITE_INVENTORY_API_URL and VITE_INVENTORY_ADAPTER=http to enable it'

export const resolveHttpBaseUrl = (raw?: string): string | null => {
  const normalized = (raw ?? '').trim().replace(/\/+$/, '')
  return normalized === '' ? null : normalized
}

export const readInventoryApiUrl = (): string | undefined => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env
  return env?.['VITE_INVENTORY_API_URL']
}

// PRD App. A: POST /sessions takes uppercase GUIDED|MANUAL.
export const toAttemptMode = (mode: AttemptMode): 'GUIDED' | 'MANUAL' =>
  mode === 'guided' ? 'GUIDED' : 'MANUAL'

export type ChangeInput = {
  line_id: string
  quantity?: string | null
  unit: string
  capture_method: string
  confirm_unusual_quantity?: boolean
  state?: 'NOT_FOUND'
}

export type BatchBody = { changes: ChangeInput[] }

// App. A ChangeInput: exact-string quantity verbatim (never Number()), exact
// unit, capture_method, confirm flag; only NOT_FOUND may travel explicitly.
export const toChangeInput = (
  change: CaptureChange,
  options: { unit: string; capture_method: string },
): ChangeInput => ({
  line_id: change.lineCode,
  quantity: change.quantity,
  unit: options.unit,
  capture_method: options.capture_method,
  confirm_unusual_quantity: false,
  ...(change.state === 'NOT_FOUND' ? { state: 'NOT_FOUND' as const } : {}),
})

export const toBatchBody = (
  changes: CaptureChange[],
  options: { capture_method: string; unitsByCode?: Record<string, string> },
): BatchBody => ({
  changes: changes.map((change) =>
    toChangeInput(change, {
      // Empty unit intentionally surfaces a server 422 until capture supplies
      // per-line units (F3 owns that wiring); the client never invents one.
      unit: options.unitsByCode?.[change.lineCode] ?? '',
      capture_method: options.capture_method,
    }),
  ),
})

const CODE_BY_STATUS: Record<HttpStatus, ErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'ATTEMPT_NOT_FOUND',
  409: 'IDEMPOTENCY_CONFLICT',
  422: 'UNPROCESSABLE',
}

// Typed mapping for the six App. A statuses; anything else returns null so the
// caller never invents a code for an unmapped status.
export const toHttpError = (
  status: number,
  detail?: string,
): HttpError | null => {
  const code = (CODE_BY_STATUS as Record<number, ErrorCode | undefined>)[status]
  if (status !== Math.floor(status) || code === undefined) return null
  return new HttpError(status as HttpStatus, code, detail)
}

export type HttpTransportRequest = {
  method: 'GET' | 'POST'
  url: string
  headers?: Record<string, string>
  body?: unknown
  form?: Record<string, string>
}

export type HttpTransportResponse = { status: number; data: unknown }
export type HttpTransport = {
  request: (req: HttpTransportRequest) => Promise<HttpTransportResponse>
}

const httpClient = axios.create({ timeout: 5_000 })

export const createAxiosTransport = (): HttpTransport => ({
  request: async ({ method, url, headers, body, form }) => {
    try {
      const params = new URLSearchParams(form ?? undefined)
      const response = await httpClient.request({
        method,
        url,
        headers: {
          ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          ...headers,
        },
        data: form ? params.toString() : body,
        validateStatus: () => true,
      })
      return { status: response.status, data: response.data }
    } catch {
      throw new Error(`HTTP inventory request to ${url} failed before a response`)
    }
  },
})

const DEMO_ROLES: readonly DemoRole[] = ['operator', 'cost-leader', 'demo-admin']

// GET auth/me → DemoSession. Unknown server roles are a 403: the frontend
// mirrors roles for UX only, the server enforces them.
export const toDemoSession = (me: unknown): DemoSession => {
  const record = (me ?? {}) as Record<string, unknown>
  const role = record['role']
  if (typeof role !== 'string' || !DEMO_ROLES.includes(role as DemoRole)) {
    throw new HttpError(403, 'FORBIDDEN', `Unknown role ${String(role)}`)
  }
  return {
    userId: String(record['user_id'] ?? record['id'] ?? record['email'] ?? ''),
    displayName: String(
      record['display_name'] ?? record['name'] ?? record['email'] ?? '',
    ),
    role: role as DemoRole,
  }
}

// POST attempts/:id/submit returns the receipt verbatim: key, terminal
// status, payload_hash, and the ERP reference (null while FAILED). A receipt
// without payload_hash is rejected — the client never invents one.
export const toSubmitReceipt = (data: unknown): Receipt => {
  const record = (data ?? {}) as Record<string, unknown>
  const status = record['status']
  if (
    typeof record['key'] !== 'string' ||
    (status !== 'SUCCEEDED' && status !== 'FAILED') ||
    typeof record['payload_hash'] !== 'string'
  ) {
    throw new Error('POST submit returned a receipt without payload_hash')
  }
  return {
    key: record['key'] as string,
    status,
    payload_hash: record['payload_hash'] as string,
    erp_reference:
      typeof record['erp_reference'] === 'string'
        ? (record['erp_reference'] as string)
        : null,
  }
}

export type HttpInventoryApiOptions = {
  baseUrl: string
  transport?: HttpTransport
  tokenStore?: AuthTokenStore
}

export const createHttpInventoryApi = (
  options: HttpInventoryApiOptions,
): InventoryApiPort => {
  const baseUrl = resolveHttpBaseUrl(options.baseUrl)
  if (!baseUrl) throw new Error(HTTP_DISABLED_MESSAGE)
  const transport = options.transport ?? createAxiosTransport()
  const tokenStore = options.tokenStore ?? authTokenStorage

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await tokenStore.load()
    return token && token.expiresAt > Date.now()
      ? { Authorization: `Bearer ${token.access_token}` }
      : {}
  }

  const throwForStatus = async (status: number, detail: string) => {
    if (status === 401) await tokenStore.clear()
    throw (
      toHttpError(status, detail) ??
      new Error(`HTTP inventory request failed with status ${status}: ${detail}`)
    )
  }

  const disabled = (): never => {
    throw new Error(HTTP_DISABLED_MESSAGE)
  }

  return {
    loginDemo: async (credentials) => {
      const token = await transport.request({
        method: 'POST',
        url: `${baseUrl}/auth/token`,
        form: { email: credentials.username, password: credentials.password },
      })
      if (token.status < 200 || token.status >= 300) {
        await throwForStatus(token.status, 'POST auth/token failed')
      }
      const payload = (token.data ?? {}) as Record<string, unknown>
      if (
        typeof payload['access_token'] !== 'string' ||
        typeof payload['token_type'] !== 'string'
      ) {
        throw new Error('POST auth/token returned an invalid token payload')
      }
      // Token + expiry only — the password never reaches any store.
      await tokenStore.save({
        access_token: payload['access_token'] as string,
        token_type: payload['token_type'] as string,
        expiresAt: Date.now() + AUTH_TOKEN_TTL_MS,
      })
      const me = await transport.request({
        method: 'GET',
        url: `${baseUrl}/auth/me`,
        headers: await authHeaders(),
      })
      if (me.status < 200 || me.status >= 300) {
        await throwForStatus(me.status, 'GET auth/me failed')
      }
      return toDemoSession(me.data)
    },
    listScopes: async () => disabled(),
    startAttempt: async () => disabled(),
    getOperatorLines: async () => disabled(),
    saveBatch: async (attemptId, idempotencyKey, changes) => {
      const response = await transport.request({
        method: 'POST',
        url: `${baseUrl}/attempts/${attemptId}/lines:batch`,
        headers: { ...(await authHeaders()), 'Idempotency-Key': idempotencyKey },
        body: toBatchBody(changes, { capture_method: 'MANUAL' }),
      })
      // One attempt only: 409 (locked or same-key-different-body) surfaces
      // typed and never auto-retries.
      if (response.status < 200 || response.status >= 300) {
        await throwForStatus(response.status, `POST lines:batch for ${attemptId} failed`)
      }
    },
    getReview: async () => disabled(),
    finalize: async () => disabled(),
    submit: async (attemptId, idempotencyKey) => {
      const response = await transport.request({
        method: 'POST',
        url: `${baseUrl}/attempts/${attemptId}/submit`,
        headers: { ...(await authHeaders()), 'Idempotency-Key': idempotencyKey },
      })
      // One attempt only: 409 (same-key-different-payload) surfaces typed
      // and never auto-retries; 401 purges the stored token via throwForStatus.
      if (response.status < 200 || response.status >= 300) {
        await throwForStatus(response.status, `POST submit for ${attemptId} failed`)
      }
      return toSubmitReceipt(response.data)
    },
    getHistory: async () => disabled(),
    createRecount: async () => disabled(),
    loadPreset: async () => disabled(),
    resetDemo: async () => disabled(),
    authorizeReplacementKey: async () => disabled(),
  }
}

const disabled = (): never => {
  throw new Error(HTTP_DISABLED_MESSAGE)
}

export const disabledHttpInventoryApi: InventoryApiPort = {
  loginDemo: async () => disabled(),
  listScopes: async () => disabled(),
  startAttempt: async () => disabled(),
  getOperatorLines: async () => disabled(),
  saveBatch: async () => disabled(),
  getReview: async () => disabled(),
  getHistory: async () => disabled(),
  createRecount: async () => disabled(),
  finalize: async () => disabled(),
  submit: async (_attemptId: string, _idempotencyKey: string) => {
    void _attemptId
    void _idempotencyKey
    return disabled()
  },
  loadPreset: async () => disabled(),
  resetDemo: async () => disabled(),
  authorizeReplacementKey: async () => disabled(),
}
