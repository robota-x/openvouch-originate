import { describe, it, expect } from 'vitest'
import app from '../app.js'

const validLoan = { amount: 5000, currency: 'USDC', apy: 10.5, duration: 30 }

function json(method: string, url: string, body?: unknown) {
  return app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/loans', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/loans')
    expect(res.status).toBe(501)
  })

  it('passes unknown query params through without error', async () => {
    const res = await app.request('/api/loans?unknownParam=1')
    expect(res.status).toBe(501)
  })
})

describe('POST /api/loans', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans', validLoan)
    expect(res.status).toBe(401)
  })

  it('returns 401 when required fields are missing (auth runs before body validation)', async () => {
    // Hono does not strip unknown fields by default; auth fires first and rejects unauthenticated requests
    const res = await json('POST', '/api/loans', { amount: 5000 })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/loans/:id', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/loans/loan-123')
    expect(res.status).toBe(501)
  })
})

describe('PATCH /api/loans/:id', () => {
  it('returns 401 without a session', async () => {
    const res = await json('PATCH', '/api/loans/loan-123', { apy: 11.0 })
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown body fields (auth fires before handler)', async () => {
    const res = await json('PATCH', '/api/loans/loan-123', { status: 'funded' })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/loans/:id', () => {
  it('returns 401 without a session', async () => {
    const res = await app.request('/api/loans/loan-123', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/loans/:id/fund', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans/loan-123/fund')
    expect(res.status).toBe(401)
  })
})
