// Generates a throwaway Solana keypair for local testing.
// Usage (from the attestation-service folder):
//   node scripts/gen-test-wallet.js
//
// Save the WALLET and SECRET values — you need them for sign-message.js

import nacl from 'tweetnacl'
import bs58 from 'bs58'

const kp = nacl.sign.keyPair()

console.log('WALLET:', bs58.encode(kp.publicKey))
console.log('SECRET:', bs58.encode(kp.secretKey))
