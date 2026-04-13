import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

describe('GET /api/attestation-providers', () => {
  it('returns 501 (not yet implemented)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/attestation-providers' })
    expect(response.statusCode).toBe(501)
  })
})
