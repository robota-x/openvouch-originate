import { createMiddleware } from 'hono/factory'
import { createDb } from '../db/client.js'
import type { AppEnv } from '../types.js'

/**
 * Middleware that initialises a Drizzle D1 client and sets c.var.db.
 * When DB binding is absent (tests/dev without D1), db is left unset and
 * routes are expected to return 501 when they check for its presence.
 */
export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  if (c.env?.DB) {
    c.set('db', createDb(c.env.DB))
  }
  await next()
})
