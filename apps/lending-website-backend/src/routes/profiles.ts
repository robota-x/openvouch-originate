import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../plugins/auth.js'

type AddressParams  = { address: string }
type PatchProfileBody = { nickname?: string }

/** GET /api/profiles/:address — full public profile (chain-derived + off-chain fields). */
const getProfileSchema = {
  params: {
    type: 'object',
    required: ['address'],
    properties: { address: { type: 'string' } },
  },
} as const

/** PATCH /api/profiles/:address — update off-chain fields (own profile only). */
const patchProfileSchema = {
  params: {
    type: 'object',
    required: ['address'],
    properties: { address: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      nickname: { type: 'string', minLength: 1, maxLength: 64 },
    },
    additionalProperties: false,
  },
} as const

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: AddressParams }>('/:address', { schema: getProfileSchema }, async (_request, reply) => {
    // TODO: derive attestation PDA + loan PDA from address, hydrate from chain cache, merge off-chain fields
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.patch<{ Params: AddressParams; Body: PatchProfileBody }>(
    '/:address',
    { schema: patchProfileSchema, preHandler: authenticate },
    async (_request, reply) => {
      // TODO: verify request.user.address === params.address, apply off-chain field updates
      reply.code(501).send({ error: 'not_implemented' })
    },
  )
}

export default profileRoutes
