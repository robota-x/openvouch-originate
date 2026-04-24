import { describe, it, expect, vi, afterEach } from 'vitest'
import app from '../app.js'

afterEach(() => vi.unstubAllGlobals())

const testEnv = { COMPANIES_HOUSE_UK_API_KEY: 'test-key' }

/**
 * A minimal D1Database stub that always returns empty results.
 * Lets routes progress past the DB guard so we can test routing/business logic
 * without a real D1 instance or Cloudflare Workers runtime.
 */
const emptyD1 = {
  prepare: (_sql: string) => ({
    bind: (..._args: unknown[]) => ({
      all:   async () => ({ results: [], success: true, meta: {} }),
      run:   async () => ({ success: true, meta: {} }),
      first: async () => null,
      raw:   async () => [],
    }),
    all:   async () => ({ results: [], success: true, meta: {} }),
    run:   async () => ({ success: true, meta: {} }),
    first: async () => null,
    raw:   async () => [],
  }),
  batch: async () => [],
  exec:  async () => ({ count: 0, duration: 0 }),
  dump:  async () => new ArrayBuffer(0),
} as unknown as D1Database

function json(method: string, url: string, body?: unknown, withDb = false) {
  return app.request(
    url,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    withDb ? { ...testEnv, DB: emptyD1 } : testEnv,
  )
}

describe('POST /api/verify/start — validation', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await json('POST', '/api/verify/start', { walletAddress: 'wallet' })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('missing_fields')
  })

  it('returns 400 when body is empty', async () => {
    const res = await json('POST', '/api/verify/start', {})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/verify/email-confirm — validation', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await json('POST', '/api/verify/email-confirm', { sessionId: 'x' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown sessionId', async () => {
    const res = await json('POST', '/api/verify/email-confirm', { sessionId: 'no-such-id', otp: '123456' }, true)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/verify/sign — validation', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await json('POST', '/api/verify/sign', { sessionId: 'x' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown sessionId', async () => {
    const res = await json('POST', '/api/verify/sign', { sessionId: 'no-such-id', signature: 'abc' }, true)
    expect(res.status).toBe(404)
  })
})

describe('GET /api/verify/status/:wallet', () => {
  it('returns { verified: false } for an unknown wallet', async () => {
    const res = await app.request('/api/verify/status/UnknownWalletXXX', {}, testEnv)
    expect(res.status).toBe(200)
    const body = await res.json() as { verified: boolean }
    expect(body.verified).toBe(false)
  })
})
