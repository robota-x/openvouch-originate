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
// These tests verify the wire shape returned by the route matches what the
// frontend Loan type expects. Run against fixture data — no DB needed.

describe('GET /api/loans — contract shape', () => {
  it('returns 200 with an array of open listings', async () => {
    const res = await app.request('/api/loans', {}, FIXTURES)
    expect(res.status).toBe(200)
    const loans = await res.json() as unknown[]
    expect(Array.isArray(loans)).toBe(true)
    expect(loans.length).toBeGreaterThan(0)
  })

  it('each listing has all fields the frontend Loan type requires', async () => {
    const res  = await app.request('/api/loans', {}, FIXTURES)
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

  it('domain constraints hold for all listings', async () => {
    const res   = await app.request('/api/loans', {}, FIXTURES)
    const loans = await res.json() as Record<string, number>[]
    for (const loan of loans) {
      expect(loan.amount).toBeGreaterThan(0)
      expect(loan.apy).toBeGreaterThan(0)
      expect(loan.duration).toBeGreaterThan(0)
      expect(loan.trustScore).toBeGreaterThanOrEqual(0)
      expect(loan.trustScore).toBeLessThanOrEqual(1000)
      expect(loan.repaymentRate).toBeGreaterThanOrEqual(0)
      expect(loan.repaymentRate).toBeLessThanOrEqual(100)
      expect(loan.attestationCount).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── Without DB ────────────────────────────────────────────────────────────────

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

// ── Contract shape: GET /api/loans/:id ───────────────────────────────────────

describe('GET /api/loans/:id — contract shape', () => {
  it('returns 200 with the ContractView shape for a known id', async () => {
    const res      = await app.request('/api/loans/alice-4', {}, FIXTURES)
    expect(res.status).toBe(200)
    const contract = await res.json() as Record<string, unknown>
    expect(typeof contract.id).toBe('string')
    expect(typeof contract.borrower).toBe('string')
    expect(typeof contract.borrowerNickname).toBe('string')
    expect(typeof contract.borrowerTrustScore).toBe('number')
    expect(typeof contract.borrowerRepaymentRate).toBe('number')
    expect(typeof contract.borrowerAttestationCount).toBe('number')
    expect(typeof contract.amount).toBe('number')
    expect(typeof contract.currency).toBe('string')
    expect(typeof contract.apy).toBe('number')
    expect(typeof contract.duration).toBe('number')
    expect(['open', 'active', 'repaid', 'defaulted']).toContain(contract.status)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await app.request('/api/loans/does-not-exist', {}, FIXTURES)
    expect(res.status).toBe(404)
  })
})

// ── Without DB ────────────────────────────────────────────────────────────────

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
