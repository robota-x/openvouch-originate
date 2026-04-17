import { describe, it, expect } from 'vitest'
import app from '../app.js'
import type { Bindings } from '../types.js'

const FIXTURES: Bindings = { FIXTURES_ENABLED: 'true' } as Bindings

const validLoan = { amount: 5000, currency: 'USDC', apy: 10.5, duration: 30 }

function json(method: string, url: string, body?: unknown) {
  return app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ── Contract shape: GET /api/loans ────────────────────────────────────────────
// Verify the wire shape matches what the frontend Loan type expects.
// Runs against fixture data — no DB needed.

describe('GET /api/loans — contract shape', () => {
  it('returns 200 with an array of open listings', async () => {
    const res = await app.request('/api/loans', {}, FIXTURES)
    expect(res.status).toBe(200)
    const loans = await res.json() as unknown[]
    expect(Array.isArray(loans)).toBe(true)
    expect(loans.length).toBeGreaterThan(0)
  })

  it('each listing has all fields the frontend Loan type requires', async () => {
    const res   = await app.request('/api/loans', {}, FIXTURES)
    const loans = await res.json() as Record<string, unknown>[]
    for (const loan of loans) {
      expect(typeof loan.id).toBe('string')
      expect(typeof loan.borrower).toBe('string')
      expect(typeof loan.nickname).toBe('string')
      expect(typeof loan.amount).toBe('number')
      expect(typeof loan.currency).toBe('string')
      expect(typeof loan.apy).toBe('number')
      expect(typeof loan.duration).toBe('number')
      expect(typeof loan.trustScore).toBe('number')
      expect(typeof loan.repaymentRate).toBe('number')
      expect(typeof loan.attestationCount).toBe('number')
    }
  })
})

// ── Without DB ────────────────────────────────────────────────────────────────

describe('GET /api/loans', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/loans')
    expect(res.status).toBe(501)
  })
})

describe('GET /api/loans/:id', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await app.request('/api/loans/does-not-exist', {}, FIXTURES)
    expect(res.status).toBe(404)
  })

  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/loans/loan-123')
    expect(res.status).toBe(501)
  })
})

describe('POST /api/loans', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans', validLoan)
    expect(res.status).toBe(401)
  })

  it('returns 401 when required fields are missing (auth runs before body validation)', async () => {
    const res = await json('POST', '/api/loans', { amount: 5000 })
    expect(res.status).toBe(401)
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
