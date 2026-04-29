import type { AppConfig } from './config.js'

/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  DB:              D1Database
  JWT_SECRET:      string
  SOLANA_RPC_URL:  string
  SOLANA_PROGRAM_ID?: string
  /** Set to "true" in .dev.vars to serve fixture data instead of querying D1. */
  FIXTURES_ENABLED?: string
}

/** Per-request context variables set by middleware and read by handlers */
export type Variables = {
  user:   { address: string }
  config: AppConfig
}

/** Hono environment type threaded through the entire app */
export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
