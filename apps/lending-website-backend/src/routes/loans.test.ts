import { describe, it, expect } from 'vitest'
import app from '../app.js'
import type { Bindings } from '../types.js'

const FIXTURES: Bindings = { 
  FIXTURES_ENABLED: 'true',
  JWT_SECRET: 'test-secret',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com'
} as Bindings

const BASE_ENV: Bindings = {
  JWT_SECRET: 'test-secret',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com'
} as Bindings

const validLoan = { amount: '5000000000000', currency: 'USDC', apy: '1050', duration: 30 }

function json(method: string, url: string, body?: unknown) {
  return app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  }, BASE_ENV)
}

// ── Contract shape: GET /api/loans ────────────────────────────────────────────

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
      expect(typeof loan.amount).toBe('string')
      expect(typeof loan.currency).toBe('string')
      expect(typeof loan.apy).toBe('string')
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
    const res = await app.request('/api/loans', {}, BASE_ENV)
    expect(res.status).toBe(501)
  })
})

describe('GET /api/loans/:id', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/loans/loan-123', {}, BASE_ENV)
    expect(res.status).toBe(501)
  })
})

describe('POST /api/loans/initiate', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans/initiate', validLoan)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/loans/finalize', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans/finalize', { signature: 'sig' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/loans/:id/contribute/initiate', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans/loan-123/contribute/initiate', { amount: '100000000000' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/loans/:id/disburse/initiate', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans/loan-123/disburse/initiate')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/loans/:id/repay/initiate', () => {
  it('returns 401 without a session', async () => {
    const res = await json('POST', '/api/loans/loan-123/repay/initiate', { amount: '100000000000', installmentNumber: 1 })
    expect(res.status).toBe(401)
  })
})
