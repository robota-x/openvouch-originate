import { describe, it, expect, vi } from 'vitest'
import { verifyShuftiSignature } from './shufti.js'

describe('Shufti Service', () => {
  describe('verifyShuftiSignature', () => {
    it('should correctly verify a valid signature', async () => {
      const secret = 'test_secret'
      const rawBody = '{"event":"verification.accepted"}'
      
      // Manual computation following the logic:
      // 1. sha256(secret)
      // 2. sha256(body + secretHash)
      
      const secretHash = await sha256(secret)
      const expectedSignature = await sha256(rawBody + secretHash)
      
      const isValid = await verifyShuftiSignature(rawBody, expectedSignature, secret)
      expect(isValid).toBe(true)
    })

    it('should reject an invalid signature', async () => {
      const isValid = await verifyShuftiSignature('body', 'wrong_sig', 'secret')
      expect(isValid).toBe(false)
    })
  })
})

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
