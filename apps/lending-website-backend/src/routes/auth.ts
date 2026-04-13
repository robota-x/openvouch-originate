import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../plugins/auth.js'

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
  fastify.post<{ Body: ChallengeBody }>('/challenge', { schema: challengeSchema }, async (_request, reply) => {
    // TODO: generate a cryptographically random nonce, store it keyed by address (TTL ~5 min), return it
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.post<{ Body: VerifyBody }>('/verify', { schema: verifySchema }, async (_request, reply) => {
    // TODO: look up stored nonce for address, verify Solana Ed25519 signature, issue signed JWT / set cookie
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.delete('/session', { preHandler: authenticate }, async (_request, reply) => {
    // TODO: invalidate session (add token to denylist or delete server-side session record)
    reply.code(501).send({ error: 'not_implemented' })
  })
}

export default authRoutes
