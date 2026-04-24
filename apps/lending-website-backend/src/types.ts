import type { Db } from './db/client.js'
import type { AppConfig } from './config.js'

/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  DB:              D1Database
  JWT_SECRET:      string
  /** Set to "true" in .dev.vars to serve fixture data instead of querying D1. */
  FIXTURES_ENABLED?: string
  /**
   * Shared secret that Helius sends in the Authorization header on every webhook
   * delivery. Must match the authHeader configured when creating the webhook.
   * Set via: wrangler secret put HELIUS_WEBHOOK_AUTH --config wrangler.<env>.jsonc
   */
  HELIUS_WEBHOOK_AUTH?: string
}

/** Per-request context variables set by middleware and read by handlers */
export type Variables = {
  db:     Db
  user:   { address: string }
  config: AppConfig
}

/** Hono environment type threaded through the entire app */
export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
