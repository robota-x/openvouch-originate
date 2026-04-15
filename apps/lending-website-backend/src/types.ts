import type { Db } from './db/client.js'

/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  DB:              D1Database
  JWT_SECRET:      string
  /** Set to "true" in .dev.vars to serve fixture data instead of querying D1. */
  FIXTURES_ENABLED?: string
}

/** Per-request context variables set by middleware and read by handlers */
export type Variables = {
  db:   Db
  user: { address: string }
}

/** Hono environment type threaded through the entire app */
export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
