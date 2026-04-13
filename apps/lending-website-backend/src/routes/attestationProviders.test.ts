import { describe, it, expect } from 'vitest'
import app from '../app.js'

describe('GET /api/attestation-providers', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/attestation-providers')
    expect(res.status).toBe(501)
  })
})
