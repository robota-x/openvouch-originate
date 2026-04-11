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
        expect(loan.borrower).toMatch(/^0x[0-9a-fA-F]{40}$/)
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
