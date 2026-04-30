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
    
    const loans = profile.loans as any[]
    if (loans.length > 0) {
      expect(typeof loans[0].amount).toBe('string')
      expect(typeof loans[0].apy).toBe('string')
    }
  })

  it('returns a deterministic trust score for an unknown address without throwing', async () => {
    const res     = await app.request('/api/profiles/UnknownAddressXXX', {}, FIXTURES)
    expect(res.status).toBe(200)
    const profile = await res.json() as Record<string, unknown>
    expect(profile.trustScore as number).toBeGreaterThanOrEqual(100)
    expect(profile.trustScore as number).toBeLessThanOrEqual(1000)
    expect(profile.attestations).toHaveLength(0)
    expect(profile.loans).toHaveLength(0)
  })
})

// ── Without DB ────────────────────────────────────────────────────────────────

describe('GET /api/profiles/:address', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {}, BASE_ENV)
    expect(res.status).toBe(501)
  })
})

describe('PATCH /api/profiles/:address', () => {
  it('returns 401 without a session', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nickname: 'alice' }),
    }, BASE_ENV)
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown body fields (auth fires before handler)', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ unknownField: 'value' }),
    }, BASE_ENV)
    expect(res.status).toBe(401)
  })
})
