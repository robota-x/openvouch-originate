import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { authenticate } from '../plugins/auth.js'
import { authNonces } from '../db/schema.js'

type ChallengeBody = { address: string }
type VerifyBody    = { address: string; nonce: string; signature: string }

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

    const nonce = crypto.randomUUID()
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
    const [row] = await db
      .select()
      .from(authNonces)
      .where(eq(authNonces.address, address))

    if (!row || row.expiresAt < new Date()) {
      reply.code(401).send({ error: 'invalid_nonce' })
      return
    }

    // TODO: verify Ed25519 signature (signature) over row.nonce with address
    void signature

    await db.delete(authNonces).where(eq(authNonces.address, address))

    // TODO: issue signed JWT or set session cookie
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.delete('/session', { preHandler: authenticate }, async (_request, reply) => {
    // TODO: invalidate session (JWT denylist or server-side session delete)
    reply.code(501).send({ error: 'not_implemented' })
  })
}

export default authRoutes
