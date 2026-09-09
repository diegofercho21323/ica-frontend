import { describe, expect, it } from 'vitest'
import {
  createMemoryTokenStore,
  isAuthTokenExpired,
  type AuthToken,
} from '../../lib/auth-token'
import {
  HTTP_DISABLED_MESSAGE,
  createHttpInventoryApi,
  disabledHttpInventoryApi,
  resolveHttpBaseUrl,
  toAttemptMode,
  toBatchBody,
  toHttpError,
  type HttpTransport,
} from './http'
import { HttpError } from './errors'
import type { CaptureChange } from './models'

type SeenRequest = {
  method: string
  url: string
  headers: Record<string, string>
  body?: unknown
  form?: Record<string, string>
}

const stubTransport = (
  responses: Array<{ status: number; data: unknown }>,
  seen: SeenRequest[],
): HttpTransport => ({
  request: async (req) => {
    seen.push({
      method: req.method,
      url: req.url,
      headers: req.headers ?? {},
      body: req.body,
      form: req.form,
    })
    const next = responses.shift()
    if (!next) throw new Error('no stubbed HTTP response left')
    return next
  },
})

const changes: CaptureChange[] = [
  { lineCode: 'SKU-002', quantity: '10.10', state: 'COUNTED' },
  { lineCode: 'SKU-005', quantity: '9007199254740993.000001', state: 'COUNTED' },
  { lineCode: 'SKU-004', quantity: null, state: 'NOT_FOUND' },
]

describe('http adapter gating (no backend published, GAP-4)', () => {
  it('stays disabled without VITE_INVENTORY_API_URL and names the env var', () => {
    expect(resolveHttpBaseUrl(undefined)).toBeNull()
    expect(resolveHttpBaseUrl('')).toBeNull()
    expect(resolveHttpBaseUrl('   ')).toBeNull()
    expect(HTTP_DISABLED_MESSAGE).toMatch(/VITE_INVENTORY_API_URL/)
  })

  it('resolves a configured base URL without hardcoding one', () => {
    expect(resolveHttpBaseUrl('https://api.example.com/')).toBe(
      'https://api.example.com',
    )
    expect(
      resolveHttpBaseUrl('https://api.example.com/api/template/ica-inventory'),
    ).toBe('https://api.example.com/api/template/ica-inventory')
  })

  it('rejects every disabled operation with zero network calls', async () => {
    await expect(
      disabledHttpInventoryApi.saveBatch('att-1', 'key-1', changes),
    ).rejects.toThrow(/VITE_INVENTORY_API_URL/)
    expect(() =>
      createHttpInventoryApi({ baseUrl: '' }),
    ).toThrow(/VITE_INVENTORY_API_URL/)
  })
})

describe('http batch DTOs (PRD App. A, decimal-exact)', () => {
  it('uppercases the attempt mode for POST /sessions', () => {
    expect(toAttemptMode('guided')).toBe('GUIDED')
    expect(toAttemptMode('manual')).toBe('MANUAL')
  })

  it('carries quantities verbatim and only NOT_FOUND as explicit state', () => {
    const body = toBatchBody(changes, {
      capture_method: 'GUIDED',
      unitsByCode: { 'SKU-002': 'KG', 'SKU-005': 'KG', 'SKU-004': 'UN' },
    })
    expect(body.changes).toHaveLength(3)
    expect(body.changes[0]).toEqual({
      line_id: 'SKU-002',
      quantity: '10.10',
      unit: 'KG',
      capture_method: 'GUIDED',
      confirm_unusual_quantity: false,
    })
    // Past 2^53 with six decimals: any float coercion rewrites it.
    expect(body.changes[1].quantity).toBe('9007199254740993.000001')
    expect(body.changes[2]).toMatchObject({
      line_id: 'SKU-004',
      quantity: null,
      state: 'NOT_FOUND',
    })
  })

  it('leaves unit empty when no catalog is known (server 422 owns it)', () => {
    const body = toBatchBody([changes[0]], { capture_method: 'MANUAL' })
    expect(body.changes[0].unit).toBe('')
    expect(body.changes[0].capture_method).toBe('MANUAL')
  })
})

describe('http error mapping (typed HttpError, no auto-retry)', () => {
  it.each([400, 401, 403, 404, 409, 422])(
    'maps status %i to a typed HttpError',
    (status) => {
      const error = toHttpError(status, 'detail')
      expect(error).toBeInstanceOf(HttpError)
      expect(error?.status).toBe(status)
    },
  )

  it('returns null for unmapped statuses instead of inventing a code', () => {
    expect(toHttpError(500)).toBeNull()
    expect(toHttpError(503)).toBeNull()
  })

  it('sends one Idempotency-Key header and never retries a 409', async () => {
    const seen: SeenRequest[] = []
    const api = createHttpInventoryApi({
      baseUrl: 'https://api.example.com',
      transport: stubTransport([{ status: 409, data: {} }], seen),
      tokenStore: createMemoryTokenStore(),
    })
    const failure = await api
      .saveBatch('att-1', 'key-1', changes)
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(409)
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toBe(
      'https://api.example.com/attempts/att-1/lines:batch',
    )
    expect(seen[0].headers['Idempotency-Key']).toBe('key-1')
    expect(
      (seen[0].body as { changes: Array<{ quantity: string | null }> }).changes[1]
        .quantity,
    ).toBe('9007199254740993.000001')
  })

  it('clears the stored token on 401 and surfaces a typed error', async () => {
    const seen: SeenRequest[] = []
    const tokenStore = createMemoryTokenStore({
      access_token: 'stale',
      token_type: 'bearer',
      expiresAt: Date.now() + 60_000,
    })
    const api = createHttpInventoryApi({
      baseUrl: 'https://api.example.com',
      transport: stubTransport([{ status: 401, data: {} }], seen),
      tokenStore,
    })
    const failure = await api
      .saveBatch('att-1', 'key-1', changes)
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(401)
    expect(await tokenStore.load()).toBeNull()
  })
})

describe('http token flow (POST auth/token, never persists passwords)', () => {
  const tokenResponse = {
    status: 200,
    data: { access_token: 'tok-123', token_type: 'bearer' },
  }
  const meResponse = (role: string) => ({
    status: 200,
    data: { user_id: 'operator-1', display_name: 'Operador', role },
  })

  it('posts form email+password, stores token+expiry, resolves the role via /me', async () => {
    const seen: SeenRequest[] = []
    const tokenStore = createMemoryTokenStore()
    const api = createHttpInventoryApi({
      baseUrl: 'https://api.example.com',
      transport: stubTransport([tokenResponse, meResponse('operator')], seen),
      tokenStore,
    })
    const session = await api.loginDemo({
      username: 'operador',
      password: 'operador',
    })
    expect(session).toMatchObject({ userId: 'operator-1', role: 'operator' })
    expect(seen[0].url).toBe('https://api.example.com/auth/token')
    expect(seen[0].form).toEqual({
      email: 'operador',
      password: 'operador',
    })
    const stored = await tokenStore.load()
    expect(stored?.access_token).toBe('tok-123')
    expect(stored?.expiresAt).toBeGreaterThan(Date.now())
    expect(stored).not.toHaveProperty('password')
    expect(seen[1].headers.Authorization).toBe('Bearer tok-123')
  })

  it('rejects unknown server roles as 403 (frontend mirrors, server enforces)', async () => {
    const seen: SeenRequest[] = []
    const api = createHttpInventoryApi({
      baseUrl: 'https://api.example.com',
      transport: stubTransport([tokenResponse, meResponse('super-admin')], seen),
      tokenStore: createMemoryTokenStore(),
    })
    const failure = await api
      .loginDemo({ username: 'x', password: 'y' })
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(403)
  })
})

describe('auth token store (storage/expiry)', () => {
  const valid: AuthToken = {
    access_token: 'tok',
    token_type: 'bearer',
    expiresAt: Date.now() + 60_000,
  }

  it('treats missing or expired tokens as expired', () => {
    expect(isAuthTokenExpired(null)).toBe(true)
    expect(
      isAuthTokenExpired({ ...valid, expiresAt: Date.now() - 1 }),
    ).toBe(true)
    expect(isAuthTokenExpired(valid)).toBe(false)
  })

  it('round-trips a token and clears it', async () => {
    const store = createMemoryTokenStore()
    expect(await store.load()).toBeNull()
    await store.save(valid)
    expect(await store.load()).toEqual(valid)
    await store.clear()
    expect(await store.load()).toBeNull()
  })
})
