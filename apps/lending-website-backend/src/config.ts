import { Registry } from '@openvouch/idl'
import { createMiddleware } from 'hono/factory'
import type { AppEnv, Bindings } from './types.js'

// ── Config type ───────────────────────────────────────────────────────────────

export interface AppConfig {
  /** HS256 secret for JWT signing/verification. */
  jwtSecret: string
  /** Shared secret Helius sends in Authorization header. */
  heliusWebhookAuth: string | undefined
  /** When true, routes return fixture data instead of querying D1. */
  fixturesEnabled: boolean
  /** On-chain program IDs. */
  programs: {
    genericRecord: string
    dbltLending: string
  }
  blockchain: {
    rpcUrl: string
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
  const genericRecord = Registry.getProgramId('generic_record')
  const dbltLending = Registry.getProgramId('dblt_lending')
  
  if (!genericRecord || !dbltLending) {
    throw new Error('Required program IDs missing from @openvouch/idl registry')
  }

  const jwtSecret = env?.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  const rpcUrl = env?.SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error('SOLANA_RPC_URL is required');
  }

  return {
    jwtSecret,
    heliusWebhookAuth: env?.HELIUS_WEBHOOK_AUTH,
    fixturesEnabled:   env?.FIXTURES_ENABLED === 'true',
    programs: {
      genericRecord,
      dbltLending,
    },
    blockchain: {
      rpcUrl,
    }
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

/** Builds config once per request and stores it in c.var.config. */
export const configMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', buildConfig(c.env))
  await next()
})
