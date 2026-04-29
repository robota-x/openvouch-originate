import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { configMiddleware } from '../config.js'
import { authenticate, createToken } from './session.js'
import type { AppEnv, Bindings } from '../types.js'

// Minimal app wired with configMiddleware + authenticate for isolation testing.
// configMiddleware must precede authenticate so c.get('config') is available.
function makeApp() {
  const app = new Hono<AppEnv>()
  app.use('*', configMiddleware)
  app.get('/protected', authenticate, (c) => c.json({ ok: true }))
  return app
}

describe('authenticate middleware', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const res = await makeApp().request('/protected')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'not_authenticated' })
  })

  it('returns 401 when JWT_SECRET binding is absent', async () => {
    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer some.token.here' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for a malformed token even with a secret configured', async () => {
    const secret = 'test-secret-at-least-32-chars!!'
    const env: Bindings = { 
      DB: undefined as unknown as D1Database, 
      JWT_SECRET: secret,
      SOLANA_RPC_URL: 'https://api.devnet.solana.com'
    }
    const res = await makeApp().request('/protected', {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    }, env)
    expect(res.status).toBe(401)
  })

  it('calls next and exposes user for a valid token', async () => {
    const secret = 'test-secret-at-least-32-chars!!'
    const token  = await createToken(secret, '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    const env: Bindings = { 
      DB: undefined as unknown as D1Database, 
      JWT_SECRET: secret,
      SOLANA_RPC_URL: 'https://api.devnet.solana.com'
    }
    const res = await makeApp().request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    }, env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
