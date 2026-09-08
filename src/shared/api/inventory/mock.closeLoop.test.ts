import { beforeEach, describe, expect, it } from 'vitest'
import { HttpError } from './errors'
import { mockInventoryApi } from './mock'

const attemptOf = async (scopeId = 'scope-centro') =>
  mockInventoryApi.startAttempt(scopeId, 'guided')

describe('mock close-loop contract (PR1)', () => {
  beforeEach(async () => {
    await mockInventoryApi.resetDemo()
  })

  it('startAttempt mints deterministic ids per scope', async () => {
    const first = await attemptOf('scope-centro')
    const second = await attemptOf('scope-centro')
    expect(first.id).toBe('att-1-scope-centro')
    expect(second.id).toBe('att-2-scope-centro')
    expect(first.mode).toBe('guided')
  })

  it('startAttempt rejects an unknown scope', async () => {
    const failure = await attemptOf('scope-unknown').catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(404)
  })

  it('finalize without confirm surfaces 422 while lines are pending', async () => {
    const attempt = await attemptOf()
    const failure = await mockInventoryApi
      .finalize(attempt.id)
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(422)
  })

  it('finalize with confirm locks an immutable version', async () => {
    const attempt = await attemptOf()
    const version = await mockInventoryApi.finalize(attempt.id, {
      confirm_uncounted: true,
    })
    expect(version.v).toBe(1)

    const failure = await mockInventoryApi
      .saveBatch('locked-key', [
        { lineCode: 'SKU-001', quantity: '1', state: 'COUNTED' },
      ])
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(409)
  })

  it('submit replays the same key without duplicate effects', async () => {
    const attempt = await attemptOf()
    await mockInventoryApi.finalize(attempt.id, { confirm_uncounted: true })
    const first = await mockInventoryApi.submit(attempt.id, 'submit-key')
    const replay = await mockInventoryApi.submit(attempt.id, 'submit-key')
    expect(replay).toEqual(first)
    expect(first.status).toBe('SUCCEEDED')
  })

  it('submit reuses the key on a different payload only via 409 + replacement', async () => {
    const first = await attemptOf('scope-centro')
    await mockInventoryApi.saveBatch('cap-1', [
      { lineCode: 'SKU-001', quantity: '5', state: 'COUNTED' },
    ])
    await mockInventoryApi.finalize(first.id, { confirm_uncounted: true })
    await mockInventoryApi.submit(first.id, 'submit-key')
    // Fresh fixture lines hash differently from the counted first attempt.
    const second = await attemptOf('scope-norte')
    await mockInventoryApi.finalize(second.id, { confirm_uncounted: true })
    const conflict = await mockInventoryApi
      .submit(second.id, 'submit-key')
      .catch((error: unknown) => error)
    expect(conflict).toBeInstanceOf(HttpError)
    expect((conflict as HttpError).status).toBe(409)

    const replacement = await mockInventoryApi.authorizeReplacementKey('submit-key')
    await expect(
      mockInventoryApi.submit(second.id, replacement),
    ).resolves.toMatchObject({ status: 'SUCCEEDED' })
  })

  it('createRecount denies a non-leader with 403', async () => {
    await mockInventoryApi.loginDemo({ username: 'operador', password: 'operador' })
    const attempt = await attemptOf()
    await mockInventoryApi.finalize(attempt.id, { confirm_uncounted: true })
    const failure = await mockInventoryApi
      .createRecount(attempt.id, { lineCodes: ['SKU-001'], assignee: 'operator-1' })
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(403)
  })

  it('createRecount rejects an empty selection with 400 and starts v2 blind', async () => {
    await mockInventoryApi.loginDemo({ username: 'lider', password: 'lider' })
    const attempt = await attemptOf()
    await mockInventoryApi.finalize(attempt.id, { confirm_uncounted: true })
    await expect(
      mockInventoryApi.createRecount(attempt.id, { lineCodes: [], assignee: 'operator-1' }),
    ).rejects.toMatchObject({ status: 400 })

    const recount = await mockInventoryApi.createRecount(attempt.id, {
      lineCodes: ['SKU-002'],
      assignee: 'operator-1',
    })
    const lines = await mockInventoryApi.getOperatorLines(recount.id)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ code: 'SKU-002', state: 'NOT_COUNTED' })
    expect(lines[0]?.currentQuantity).toBeNull()
  })
})
