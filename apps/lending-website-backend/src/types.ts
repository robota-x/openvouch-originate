import type { Db } from './db/client.js'

/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  DB:         D1Database
  JWT_SECRET: string
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
