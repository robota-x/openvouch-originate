import { describe, it, expect, vi, afterEach } from 'vitest'
import app from '../app.js'

afterEach(() => vi.unstubAllGlobals())

function json(method: string, url: string, body?: unknown) {
  return app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
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
    const res = await json('POST', '/api/verify/email-confirm', { sessionId: 'no-such-id', otp: '123456' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/verify/sign — validation', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await json('POST', '/api/verify/sign', { sessionId: 'x' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown sessionId', async () => {
    const res = await json('POST', '/api/verify/sign', { sessionId: 'no-such-id', signature: 'abc' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/verify/status/:wallet', () => {
  it('returns { verified: false } for an unknown wallet', async () => {
    const res = await app.request('/api/verify/status/UnknownWalletXXX')
    expect(res.status).toBe(200)
    const body = await res.json() as { verified: boolean }
    expect(body.verified).toBe(false)
  })
})
