export type IdempotencyKeyStore = {
  get(key: string): Promise<string | undefined>
  set(key: string, value: string): Promise<void>
  del(key: string): Promise<void>
}

const fingerprintFor = (operation: string, payload: string) => {
  return `${operation}:${payload}`
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
    const key = crypto.randomUUID()
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
