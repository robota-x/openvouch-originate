import { describe, it, expect } from 'vitest'
import { generateOtp, otpExpiry, isOtpValid } from './otp.js'

describe('generateOtp', () => {
  it('returns a 6-digit numeric string', () => {
    expect(generateOtp()).toMatch(/^\d{6}$/)
  })
})

describe('otpExpiry', () => {
  it('returns a timestamp 15 minutes in the future', () => {
    const before = Date.now()
    const expiry = otpExpiry()
    const after = Date.now()
    expect(expiry).toBeGreaterThanOrEqual(before + 15 * 60 * 1000)
    expect(expiry).toBeLessThanOrEqual(after + 15 * 60 * 1000)
  })
})

describe('isOtpValid', () => {
  it('returns true for a matching code within expiry', () => {
    expect(isOtpValid('123456', '123456', Date.now() + 60_000)).toBe(true)
  })

  it('returns false for a wrong code', () => {
    expect(isOtpValid('000000', '123456', Date.now() + 60_000)).toBe(false)
  })

  it('returns false when expired', () => {
    expect(isOtpValid('123456', '123456', Date.now() - 1)).toBe(false)
  })
})
