import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { authenticate, createToken } from './session.js'
import type { AppEnv } from '../types.js'

// Minimal app wired with the authenticate middleware for isolation testing
function makeApp(jwtSecret?: string) {
  const app = new Hono<AppEnv>()
  app.get('/protected', authenticate, (c) => c.json({ ok: true }))
  return { app, jwtSecret }
}

describe('authenticate middleware', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const { app } = makeApp()
    const res = await app.request('/protected')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'not_authenticated' })
  })

  it('returns 401 when JWT_SECRET binding is absent', async () => {
    const { app } = makeApp()
    // No env bindings passed — c.env.JWT_SECRET is undefined
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer some.token.here' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for a malformed token even with a secret configured', async () => {
    const secret = 'test-secret-at-least-32-chars!!'
    const { app } = makeApp(secret)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    }, { DB: undefined as unknown as D1Database, JWT_SECRET: secret })
    expect(res.status).toBe(401)
  })

  it('calls next and exposes user for a valid token', async () => {
    const secret  = 'test-secret-at-least-32-chars!!'
    const token   = await createToken(secret, '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    const { app } = makeApp(secret)
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    }, { DB: undefined as unknown as D1Database, JWT_SECRET: secret })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
