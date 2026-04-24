import { createMiddleware } from 'hono/factory'
import type { AppEnv, Bindings } from './types.js'

// ── Config type ───────────────────────────────────────────────────────────────

export interface AppConfig {
  /** Companies House API key. Required — requests fail fast if absent. */
  chApiKey: string
  /** SendGrid API key. undefined = dev/test mode (OTP printed to console). */
  sendgridKey: string | undefined
  /** From address for outgoing email. */
  emailFrom: string
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
  const chApiKey = env?.CH_API_KEY
  if (!chApiKey) {
    throw new Error('[attestation-uk-company-service] CH_API_KEY binding is required')
  }

  return {
    chApiKey,
    sendgridKey: env?.SENDGRID_KEY,
    emailFrom:   env?.EMAIL_FROM ?? 'noreply@openvouch.io',
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

/** Builds config once per request and stores it in c.var.config. */
export const configMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', buildConfig(c.env))
  await next()
})
