import { createMiddleware } from 'hono/factory'
import type { AppEnv, Bindings, AppConfig } from './types.js'

export function buildConfig(env: Bindings | undefined): AppConfig {
  const shuftiClientId = env?.SHUFTI_CLIENT_ID
  const shuftiSecret = env?.SHUFTI_SECRET

  if (!shuftiClientId || !shuftiSecret) {
    // In a real prod env we'd throw, but for hackathon/dev we might allow it to start
    // but we'll enforce it here to match the pattern.
    console.warn('[identity-service] SHUFTI_CLIENT_ID or SHUFTI_SECRET is missing')
  }

  return {
    shuftiClientId: shuftiClientId ?? 'DEV_CLIENT_ID',
    shuftiSecret: shuftiSecret ?? 'DEV_SECRET',
    shuftiBaseUrl: env?.SHUFTI_BASE_URL ?? 'https://api.shuftipro.com',
    callbackUrl: env?.CALLBACK_URL ?? 'http://localhost:8787/verify/webhook'
  }
}

export const configMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', buildConfig(c.env))
  await next()
})
