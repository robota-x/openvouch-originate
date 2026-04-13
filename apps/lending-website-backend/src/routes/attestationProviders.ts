import type { FastifyPluginAsync } from 'fastify'

/** GET /api/attestation-providers — list all registered attestation providers. */
const attestationProviderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    // TODO: return the registry of known attestation providers (static config or DB)
    reply.code(501).send({ error: 'not_implemented' })
  })
}

export default attestationProviderRoutes
