import { describe, it, expect } from 'vitest'
import app from '../app.js'
import type { Bindings } from '../types.js'

const FIXTURES: Bindings = { FIXTURES_ENABLED: 'true' } as Bindings
const ALICE = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'

// ── Contract shape: GET /api/profiles/:address ────────────────────────────────

describe('GET /api/profiles/:address — contract shape', () => {
  it('returns 200 with the full Profile shape for a known address', async () => {
    const res     = await app.request(`/api/profiles/${ALICE}`, {}, FIXTURES)
    expect(res.status).toBe(200)
    const profile = await res.json() as Record<string, unknown>
    expect(profile.address).toBe(ALICE)
    expect(typeof profile.nickname).toBe('string')
    expect(typeof profile.trustScore).toBe('number')
    expect(Array.isArray(profile.attestations)).toBe(true)
    expect(Array.isArray(profile.loans)).toBe(true)
  })

  it('each ProfileLoan has the fields the frontend expects', async () => {
    const res     = await app.request(`/api/profiles/${ALICE}`, {}, FIXTURES)
    const profile = await res.json() as { loans: Record<string, unknown>[] }
    expect(profile.loans.length).toBeGreaterThan(0)
    for (const loan of profile.loans) {
      expect(typeof loan.id).toBe('string')
      expect(typeof loan.amount).toBe('number')
      expect(typeof loan.currency).toBe('string')
      expect(typeof loan.apy).toBe('number')
      expect(typeof loan.duration).toBe('number')
      expect(typeof loan.repaid).toBe('number')
      expect(['open', 'active', 'repaid', 'defaulted']).toContain(loan.status)
      expect(loan.repaid).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns a zero-trust fallback for an unknown address without throwing', async () => {
    const res     = await app.request('/api/profiles/UnknownAddressXXX', {}, FIXTURES)
    expect(res.status).toBe(200)
    const profile = await res.json() as Record<string, unknown>
    expect(profile.trustScore).toBe(0)
    expect(profile.attestations).toHaveLength(0)
    expect(profile.loans).toHaveLength(0)
  })
})

// ── Without DB ────────────────────────────────────────────────────────────────

describe('GET /api/profiles/:address', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    expect(res.status).toBe(501)
  })
})

describe('PATCH /api/profiles/:address', () => {
  it('returns 401 without a session', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nickname: 'alice' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown body fields (auth fires before handler)', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ unknownField: 'value' }),
    })
    expect(res.status).toBe(401)
  })
})
