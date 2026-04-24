import { describe, it, expect } from 'vitest'
import { buildChallengeMessage, verifyWalletSignature } from './walletVerifier.js'

describe('buildChallengeMessage', () => {
  it('includes the company number and wallet address', () => {
    const msg = buildChallengeMessage('12345678', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    expect(msg).toContain('12345678')
    expect(msg).toContain('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
  })

  it('includes a unix timestamp', () => {
    const before = Math.floor(Date.now() / 1000)
    const msg = buildChallengeMessage('12345678', 'wallet')
    const after = Math.floor(Date.now() / 1000)
    const match = msg.match(/timestamp (\d+)/)
    expect(match).not.toBeNull()
    const ts = parseInt(match![1], 10)
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})

describe('verifyWalletSignature', () => {
  it('returns false for a garbage signature without throwing', () => {
    const result = verifyWalletSignature(
      'some message',
      'bm90YXJlYWxzaWduYXR1cmU=', // base64 of "notarealsignature"
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    )
    expect(result).toBe(false)
  })

  it('returns false for malformed base64 without throwing', () => {
    expect(verifyWalletSignature('msg', '!!!not-base64!!!', 'wallet')).toBe(false)
  })
})
