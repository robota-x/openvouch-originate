import { describe, it, expect } from 'vitest'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
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
  it('returns true for a valid signature', () => {
    const keypair = nacl.sign.keyPair()
    const wallet = bs58.encode(keypair.publicKey)
    const message = buildChallengeMessage('12345678', wallet)
    const msgBytes = new TextEncoder().encode(message)
    const sig = nacl.sign.detached(msgBytes, keypair.secretKey)
    const signature = Buffer.from(sig).toString('base64')
    expect(verifyWalletSignature(message, signature, wallet)).toBe(true)
  })

  it('returns false for a signature from a different keypair', () => {
    const keypair1 = nacl.sign.keyPair()
    const keypair2 = nacl.sign.keyPair()
    const message = buildChallengeMessage('12345678', bs58.encode(keypair1.publicKey))
    const msgBytes = new TextEncoder().encode(message)
    const sig = nacl.sign.detached(msgBytes, keypair2.secretKey)
    expect(verifyWalletSignature(message, Buffer.from(sig).toString('base64'), bs58.encode(keypair1.publicKey))).toBe(false)
  })

  it('returns false for a garbage signature without throwing', () => {
    expect(verifyWalletSignature('some message', 'bm90YXJlYWxzaWduYXR1cmU=', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')).toBe(false)
  })

  it('returns false for malformed base64 without throwing', () => {
    expect(verifyWalletSignature('msg', '!!!not-base64!!!', 'wallet')).toBe(false)
  })
})
