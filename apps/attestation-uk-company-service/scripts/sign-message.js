// Signs a challenge message with a Solana secret key for local testing.
// Usage (from the attestation-uk-company-service folder):
//   SECRET_KEY=<your_secret> CHALLENGE="<exact challenge message>" node scripts/sign-message.js
//
// The CHALLENGE must be the exact challengeMessage returned by POST /api/verify/start.
// Copy it including the timestamp — one character difference invalidates the signature.

import nacl from 'tweetnacl'
import bs58 from 'bs58'

const secretB58 = process.env.SECRET_KEY
const message = process.env.CHALLENGE

if (!secretB58 || !message) {
  console.error('Usage: SECRET_KEY=<secret> CHALLENGE="<message>" node scripts/sign-message.js')
  process.exit(1)
}

const secretKey = bs58.decode(secretB58)
const msgBytes = Buffer.from(message, 'utf8')
const sig = nacl.sign.detached(msgBytes, secretKey)

console.log('SIG:', Buffer.from(sig).toString('base64'))
