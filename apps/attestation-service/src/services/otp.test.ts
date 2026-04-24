import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateOtp, isOtpValid, otpExpiry, sendOtpEmail } from './otp.js'

afterEach(() => vi.restoreAllMocks())

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

describe('sendOtpEmail', () => {
  it('does not throw in dev mode (no SendGrid key)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await expect(
      sendOtpEmail('user@example.com', '123456', 'Acme', {
        sendgridKey: undefined,
        emailFrom: 'noreply@openvouch.io',
      }),
    ).resolves.toBeUndefined()
    expect(logSpy).toHaveBeenCalled()
  })

  it('throws when SendGrid key exists (production path not implemented yet)', async () => {
    await expect(
      sendOtpEmail('user@example.com', '123456', 'Acme', {
        sendgridKey: 'sg-key',
        emailFrom: 'noreply@openvouch.io',
      }),
    ).rejects.toThrow(/not yet implemented/)
  })
})
