import { describe, expect, it } from 'vitest'
import { createMemoryTokenStore } from '../../lib/auth-token'
import { HttpError } from './errors'
import { createHttpInventoryApi, type HttpTransport } from './http'

type SeenRequest = {
  method: string
  url: string
  headers: Record<string, string>
  body?: unknown
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
    })
    const next = responses.shift()
    if (!next) throw new Error('no stubbed HTTP response left')
    return next
  },
})

const succeededReceipt = {
  key: 'submit-key-1',
  status: 'SUCCEEDED',
  payload_hash: 'deadbeef',
  erp_reference: 'erp-att-1-v1',
}

const apiWith = (
  responses: Array<{ status: number; data: unknown }>,
  seen: SeenRequest[],
  expiredToken = false,
) =>
  createHttpInventoryApi({
    baseUrl: 'https://api.example.com',
    transport: stubTransport(responses, seen),
    tokenStore: expiredToken
      ? createMemoryTokenStore({
          access_token: 'stale',
          token_type: 'bearer',
          expiresAt: Date.now() + 60_000,
        })
      : createMemoryTokenStore(),
  })

describe('http submit wiring (idempotent, fake transport only)', () => {
  it('posts to the attempt submit path with one Idempotency-Key and returns the receipt verbatim', async () => {
    const seen: SeenRequest[] = []
    const api = apiWith([{ status: 200, data: succeededReceipt }], seen)
    const receipt = await api.submit('att-1', 'submit-key-1')
    expect(receipt).toEqual(succeededReceipt)
    expect(receipt.payload_hash).toBe('deadbeef')
    expect(seen).toHaveLength(1)
    expect(seen[0].method).toBe('POST')
    expect(seen[0].url).toBe('https://api.example.com/attempts/att-1/submit')
    expect(seen[0].headers['Idempotency-Key']).toBe('submit-key-1')
  })

  it('replays the same key without duplicate effects (same receipt, same key)', async () => {
    const seen: SeenRequest[] = []
    const api = apiWith(
      [
        { status: 200, data: succeededReceipt },
        { status: 200, data: { ...succeededReceipt } },
      ],
      seen,
    )
    const first = await api.submit('att-1', 'submit-key-1')
    const replay = await api.submit('att-1', 'submit-key-1')
    expect(replay).toEqual(first)
    expect(seen).toHaveLength(2)
    expect(seen[1].headers['Idempotency-Key']).toBe('submit-key-1')
  })

  it('passes a FAILED receipt through with a null erp_reference', async () => {
    const failed = {
      key: 'retry-key',
      status: 'FAILED',
      payload_hash: 'cafef00d',
      erp_reference: null,
    }
    const seen: SeenRequest[] = []
    const api = apiWith([{ status: 200, data: failed }], seen)
    const receipt = await api.submit('att-1', 'retry-key')
    expect(receipt).toEqual(failed)
    expect(receipt.status).toBe('FAILED')
    expect(receipt.erp_reference).toBeNull()
  })

  it('blocks a 409 conflict as a typed error with exactly one request (never auto-retries)', async () => {
    const seen: SeenRequest[] = []
    const api = apiWith([{ status: 409, data: {} }], seen)
    const failure = await api
      .submit('att-1', 'submit-key-1')
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(409)
    expect(seen).toHaveLength(1)
  })

  it('purges the stored token on 401 and surfaces a typed error', async () => {
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
      .submit('att-1', 'submit-key-1')
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(401)
    expect(await tokenStore.load()).toBeNull()
  })

  it('rejects a receipt without payload_hash instead of inventing one', async () => {
    const seen: SeenRequest[] = []
    const api = apiWith(
      [{ status: 200, data: { key: 'k', status: 'SUCCEEDED' } }],
      seen,
    )
    await expect(api.submit('att-1', 'k')).rejects.toThrow(/payload_hash/)
  })
})
