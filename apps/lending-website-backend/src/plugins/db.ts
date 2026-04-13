import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { createDb, type Db } from '../db/client.js'

declare module 'fastify' {
  interface FastifyInstance {
    /** Drizzle D1 client. Undefined when no D1 binding is provided (dev/test). */
    db: Db | undefined
  }
}

/**
 * Registers a Drizzle D1 client as fastify.db.
 * Uses fastify-plugin so the decoration is visible to the parent scope.
 */
const dbPlugin: FastifyPluginAsync<{ d1?: D1Database }> = async (fastify, opts) => {
  fastify.decorate('db', opts.d1 ? createDb(opts.d1) : undefined)
}

export default fp(dbPlugin, { name: 'db' })
