import { describe, it, expect } from 'vitest'
import { backendClient } from './client'
import { ApiError } from '../types'

describe('backendClient', () => {
  describe('getOpenRequests', () => {
    it('resolves to a non-empty array', async () => {
      const loans = await backendClient.getOpenRequests()
      expect(Array.isArray(loans)).toBe(true)
      expect(loans.length).toBeGreaterThan(0)
    })

    it('each loan has all required fields with correct types', async () => {
      const loans = await backendClient.getOpenRequests()
      for (const loan of loans) {
        expect(typeof loan.borrower).toBe('string')
        expect(typeof loan.nickname).toBe('string')
        expect(typeof loan.amount).toBe('number')
        expect(typeof loan.currency).toBe('string')
        expect(typeof loan.apy).toBe('number')
        expect(typeof loan.duration).toBe('number')
        expect(typeof loan.repaymentRate).toBe('number')
        expect(typeof loan.attestationCount).toBe('number')
        expect(typeof loan.trustScore).toBe('number')
      }
    })

    it('each loan satisfies domain constraints', async () => {
      const loans = await backendClient.getOpenRequests()
      for (const loan of loans) {
        expect(loan.repaymentRate).toBeGreaterThanOrEqual(0)
        expect(loan.repaymentRate).toBeLessThanOrEqual(100)
        expect(loan.apy).toBeGreaterThan(0)
        expect(loan.amount).toBeGreaterThan(0)
        expect(loan.duration).toBeGreaterThan(0)
        expect(loan.attestationCount).toBeGreaterThanOrEqual(0)
        expect(loan.trustScore).toBeGreaterThanOrEqual(0)
        expect(loan.trustScore).toBeLessThanOrEqual(1000)
        expect(loan.borrower).toMatch(/^0x[0-9a-fA-F]{40}$/)
      }
    })
  })

  describe('getProfile', () => {
    const KNOWN = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

    it('resolves a known address to a full profile', async () => {
      const profile = await backendClient.getProfile(KNOWN)
      expect(profile.address).toBe(KNOWN)
      expect(typeof profile.nickname).toBe('string')
      expect(profile.trustScore).toBeGreaterThan(0)
      expect(Array.isArray(profile.attestations)).toBe(true)
      expect(Array.isArray(profile.loans)).toBe(true)
      expect(profile.attestations.length).toBeGreaterThan(0)
      expect(profile.loans.length).toBeGreaterThan(0)
    })

    it('resolves an unknown address to a fallback without throwing', async () => {
      const profile = await backendClient.getProfile('0x000000000000000000000000000000000000dead')
      expect(profile.trustScore).toBe(0)
      expect(profile.attestations).toHaveLength(0)
      expect(profile.loans).toHaveLength(0)
    })

    it('each loan has required fields and a valid status', async () => {
      const profile = await backendClient.getProfile(KNOWN)
      for (const loan of profile.loans) {
        expect(typeof loan.id).toBe('string')
        expect(typeof loan.amount).toBe('number')
        expect(typeof loan.currency).toBe('string')
        expect(typeof loan.apy).toBe('number')
        expect(typeof loan.duration).toBe('number')
        expect(typeof loan.repaid).toBe('number')
        expect(['open', 'active', 'closed']).toContain(loan.status)
        expect(loan.repaid).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('getAttestationProviders', () => {
    it('resolves to a non-empty array', async () => {
      const providers = await backendClient.getAttestationProviders()
      expect(Array.isArray(providers)).toBe(true)
      expect(providers.length).toBeGreaterThan(0)
    })

    it('each provider has all required fields', async () => {
      const providers = await backendClient.getAttestationProviders()
      for (const p of providers) {
        expect(typeof p.id).toBe('string')
        expect(typeof p.name).toBe('string')
        expect(typeof p.wallet).toBe('string')
        expect(typeof p.website).toBe('string')
        expect(typeof p.claimUrl).toBe('string')
        expect(typeof p.description).toBe('string')
      }
    })

    it('each provider wallet is a valid address', async () => {
      const providers = await backendClient.getAttestationProviders()
      for (const p of providers) {
        expect(p.wallet).toMatch(/^0x[0-9a-fA-F]{40}$/)
      }
    })

    it('each claimUrl contains the {address} placeholder', async () => {
      const providers = await backendClient.getAttestationProviders()
      for (const p of providers) {
        expect(p.claimUrl).toContain('{address}')
      }
    })
  })
})

// Verify ApiError is importable and constructable from this layer
describe('ApiError', () => {
  it('carries code, status, and message', () => {
    const err = new ApiError('not found', 'LOANS_NOT_FOUND', 404)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ApiError')
    expect(err.message).toBe('not found')
    expect(err.code).toBe('LOANS_NOT_FOUND')
    expect(err.status).toBe(404)
  })

  it('status is optional', () => {
    const err = new ApiError('unknown', 'UNKNOWN')
    expect(err.status).toBeUndefined()
  })
})
