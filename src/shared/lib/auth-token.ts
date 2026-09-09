import { createStore, del, get, set } from 'idb-keyval'

// Token-only persistence for the HTTP auth flow (PRD App. A: POST auth/token
// → {access_token, token_type}). The password is never stored here — only the
// token plus a client-side expiry. The backend publishes no `exp` yet (GAP-4),
// so expiry defaults to AUTH_TOKEN_TTL_MS after login; any 401 clears early.
export type AuthToken = {
  access_token: string
  token_type: string
  expiresAt: number
}

export const AUTH_TOKEN_TTL_MS = 3_600_000

export const isAuthTokenExpired = (
  token: AuthToken | null | undefined,
  now: number = Date.now(),
): boolean => token == null || token.expiresAt <= now

export type AuthTokenStore = {
  load: () => Promise<AuthToken | null>
  save: (token: AuthToken) => Promise<void>
  clear: () => Promise<void>
}

export const createMemoryTokenStore = (
  initial: AuthToken | null = null,
): AuthTokenStore => {
  let current = initial
  return {
    load: async () => current,
    save: async (token) => {
      current = token
    },
    clear: async () => {
      current = null
    },
  }
}

const store = createStore('ica-auth', 'tokens')
const authTokenKey = 'auth-token'

export const authTokenStorage: AuthTokenStore = {
  load: async () => {
    try {
      return (await get<AuthToken>(authTokenKey, store)) ?? null
    } catch {
      return null
    }
  },
  save: async (token) => {
    await set(authTokenKey, token, store)
  },
  clear: async () => {
    try {
      await del(authTokenKey, store)
    } catch {
      // Auth state already converges to anonymous; errors surface on next save.
    }
  },
}
