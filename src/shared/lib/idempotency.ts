export type IdempotencyKeyStore = {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
  del(key: string): Promise<void>
}

const fingerprintFor = (operation: string, payload: string) => {
  return `${operation}:${payload}`
}

// `crypto.randomUUID` is absent in some runtimes (notably jsdom), so mint
// with a fallback. Uniqueness per process is enough here because the
// registry already dedupes by operation fingerprint. Exported so deliberate
// recovery flows (e.g. submission-queue conflict resolution) can mint a
// genuinely new key without duplicating this fallback.
export const mintKey = (): string => {
  const candidate = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto
  if (candidate && typeof candidate.randomUUID === 'function') {
    return candidate.randomUUID()
  }
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const createIdempotencyRegistry = (keyStore: IdempotencyKeyStore) => {
  const inFlight = new Map<string, Promise<string>>()

  const resolveKey = async (
    operation: string,
    payload: string,
  ): Promise<string> => {
    const fingerprint = fingerprintFor(operation, payload)
    const current = await keyStore.get(fingerprint)
    if (current) return current
    const key = mintKey()
    await keyStore.set(fingerprint, key)
    return key
  }

  const getKey = (operation: string, payload: string): Promise<string> => {
    const fingerprint = fingerprintFor(operation, payload)
    const pending = inFlight.get(fingerprint)
    if (pending) return pending

    const resolution = resolveKey(operation, payload)
    inFlight.set(fingerprint, resolution)
    const clear = () => inFlight.delete(fingerprint)
    void resolution.then(clear, clear)
    return resolution
  }

  const clearKey = async (
    operation: string,
    payload: string,
  ): Promise<void> => {
    await keyStore.del(fingerprintFor(operation, payload))
  }

  return { getKey, clearKey }
}
