import { createMiddleware } from 'hono/factory'
import type { AppEnv, Bindings } from './types.js'

// ── Config type ───────────────────────────────────────────────────────────────

export interface AppConfig {
  /** HS256 secret for JWT signing/verification. undefined when not configured. */
  jwtSecret: string | undefined
  /** Shared secret Helius sends in Authorization header. undefined = webhook disabled. */
  heliusWebhookAuth: string | undefined
  /** When true, routes return fixture data instead of querying D1. */
  fixturesEnabled: boolean
  /** On-chain program IDs. Defaults to placeholder keypairs until anchor keys sync. */
  programs: {
    genericRecord: string
  }
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Build a typed config object from raw Cloudflare Workers bindings.
 *
 * This is the single place where environment variable names are resolved and
 * any defaults are applied. No code path outside this file should read from
 * `c.env` directly or apply its own defaults.
 */
export function buildConfig(env: Bindings | undefined): AppConfig {
  return {
    jwtSecret:         env?.JWT_SECRET,
    heliusWebhookAuth: env?.HELIUS_WEBHOOK_AUTH,
    fixturesEnabled:   env?.FIXTURES_ENABLED === 'true',
    programs: {
      // Default matches the placeholder in Anchor.toml.
      // Override via GENERIC_RECORD_PROGRAM_ID after `anchor keys sync` + deployment.
      genericRecord: env?.GENERIC_RECORD_PROGRAM_ID ?? 'HoDHdk8dsDqbALi3ZPGxe8imvZa68Ys9y34FXoKpDHzV',
    },
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

/** Builds config once per request and stores it in c.var.config. */
export const configMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', buildConfig(c.env))
  await next()
})
