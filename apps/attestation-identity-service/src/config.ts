import { createMiddleware } from 'hono/factory'
import type { AppEnv, Bindings, AppConfig, IdentityProviderMode } from './types.js'

export function buildConfig(env: Bindings | undefined): AppConfig {
  const rawMode = env?.IDENTITY_PROVIDER_MODE ?? 'mock'
  if (rawMode !== 'mock' && rawMode !== 'real') {
    throw new Error('[identity-service] IDENTITY_PROVIDER_MODE must be either "mock" or "real"')
  }
  const identityProviderMode = rawMode as IdentityProviderMode
  const shuftiClientId = env?.SHUFTI_CLIENT_ID
  const shuftiSecret = env?.SHUFTI_SECRET

  if (identityProviderMode === 'real' && (!shuftiClientId || !shuftiSecret)) {
    throw new Error('[identity-service] SHUFTI_CLIENT_ID and SHUFTI_SECRET are required in real mode')
  }

  return {
    identityProviderMode,
    verifyPortalBaseUrl: env?.VERIFY_PORTAL_BASE_URL ?? 'http://localhost:5173',
    shuftiClientId: shuftiClientId ?? 'MOCK_CLIENT_ID',
    shuftiSecret: shuftiSecret ?? 'MOCK_SECRET',
    shuftiBaseUrl: env?.SHUFTI_BASE_URL ?? 'https://api.shuftipro.com',
    callbackUrl: env?.CALLBACK_URL ?? 'http://localhost:8789/verify/webhook',
  }
}

export const configMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('config', buildConfig(c.env))
  await next()
})
