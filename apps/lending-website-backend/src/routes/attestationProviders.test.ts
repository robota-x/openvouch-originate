import { describe, it, expect } from 'vitest'
import app from '../app.js'
import type { Bindings } from '../types.js'

const FIXTURES: Bindings = { FIXTURES_ENABLED: 'true' } as Bindings

// ── Contract shape: GET /api/attestation-providers ────────────────────────────

describe('GET /api/attestation-providers — contract shape', () => {
  it('returns 200 with an array of providers', async () => {
    const res = await app.request('/api/attestation-providers', {}, FIXTURES)
    expect(res.status).toBe(200)
    const providers = await res.json() as unknown[]
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
  })

  it('each provider has all fields the frontend AttestationProvider type requires', async () => {
    const res       = await app.request('/api/attestation-providers', {}, FIXTURES)
    const providers = await res.json() as Record<string, unknown>[]
    for (const p of providers) {
      expect(typeof p.id).toBe('string')
      expect(typeof p.name).toBe('string')
      expect(typeof p.wallet).toBe('string')
      expect(typeof p.website).toBe('string')
      expect(typeof p.claimUrl).toBe('string')
      expect(typeof p.description).toBe('string')
      // claimUrl must contain the address placeholder so the frontend can substitute it
      expect(p.claimUrl).toContain('{address}')
    }
  })
})

// ── Without DB ────────────────────────────────────────────────────────────────

describe('GET /api/attestation-providers', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/attestation-providers')
    expect(res.status).toBe(501)
  })
})
