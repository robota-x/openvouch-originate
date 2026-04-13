import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { verify as ed25519Verify } from '@noble/ed25519'
import { decode as bs58Decode } from 'bs58'
import { authNonces } from '../db/schema.js'

type ChallengeBody = { address: string }
type VerifyBody    = { address: string; nonce: string; signature: string }

// Signing message displayed to the user in their wallet. Must match the frontend exactly.
function buildSignMessage(nonce: string): Uint8Array {
  return new TextEncoder().encode(
    `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`
  )
}

/** POST /api/auth/challenge — issue a nonce for a wallet address to sign. */
const challengeSchema = {
  body: {
    type: 'object',
    required: ['address'],
    properties: { address: { type: 'string' } },
  },
  response: {
    200: { type: 'object', properties: { nonce: { type: 'string' } } },
  },
} as const

/** POST /api/auth/verify — verify signed nonce, return session token. */
const verifySchema = {
  body: {
    type: 'object',
    required: ['address', 'nonce', 'signature'],
    properties: {
      address:   { type: 'string' },
      nonce:     { type: 'string' },
      signature: { type: 'string' },
    },
  },
  response: {
    200: { type: 'object', properties: { token: { type: 'string' } } },
  },
} as const

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: ChallengeBody }>('/challenge', { schema: challengeSchema }, async (request, reply) => {
    const db = fastify.db
    if (!db) { reply.code(501).send({ error: 'not_implemented' }); return }

    const nonce     = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await db
      .insert(authNonces)
      .values({ address: request.body.address, nonce, expiresAt })
      .onConflictDoUpdate({ target: authNonces.address, set: { nonce, expiresAt } })

    reply.send({ nonce })
  })

  fastify.post<{ Body: VerifyBody }>('/verify', { schema: verifySchema }, async (request, reply) => {
    const db = fastify.db
    if (!db) { reply.code(501).send({ error: 'not_implemented' }); return }

    const { address, signature } = request.body

    const [row] = await db.select().from(authNonces).where(eq(authNonces.address, address))
    if (!row || row.expiresAt < new Date()) {
      reply.code(401).send({ error: 'invalid_nonce' })
      return
    }

    const sigBytes    = Buffer.from(signature, 'base64')
    const pubKeyBytes = bs58Decode(address)
    const isValid     = await ed25519Verify(sigBytes, buildSignMessage(row.nonce), pubKeyBytes)
    if (!isValid) {
      reply.code(401).send({ error: 'invalid_signature' })
      return
    }

    await db.delete(authNonces).where(eq(authNonces.address, address))

    const token = await fastify.createToken(address)
    reply.send({ token })
  })

  fastify.delete('/session', { preHandler: fastify.authenticate }, async (_request, reply) => {
    // NOTE: JWT is stateless — true revocation would require a D1 denylist (deferred).
    // This endpoint exists for UX completeness. Clients must discard the token on logout.
    reply.code(204).send()
  })
}

export default authRoutes
