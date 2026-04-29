import { createMiddleware } from 'hono/factory'
import type { AppEnv, Bindings } from './types.js'

// ── Config type ───────────────────────────────────────────────────────────────

export interface AppConfig {
  /** Companies House API key. Required — requests fail fast if absent. */
  companiesHouseUkApiKey: string
  /** Identity service URL for verification. */
  identityServiceUrl: string
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Builds a typed, fully-resolved config from raw Workers bindings.
 *
 * This is the single place where env var names are resolved, required values
 * are enforced, and defaults are applied. Nothing outside this file reads
 * from bindings directly or applies its own defaults.
 */
export function buildConfig(env: Bindings | undefined): AppConfig {
  const companiesHouseUkApiKey = env?.COMPANIES_HOUSE_UK_API_KEY
  if (!companiesHouseUkApiKey) {
    throw new Error('[attestation-uk-company-service] COMPANIES_HOUSE_UK_API_KEY binding is required')
  }

  return {
    companiesHouseUkApiKey,
    identityServiceUrl: env?.IDENTITY_SERVICE_URL ?? 'http://localhost:8789',
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

/** Builds config once per request and stores it in c.var.config. */
export const configMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', buildConfig(c.env))
  await next()
})
