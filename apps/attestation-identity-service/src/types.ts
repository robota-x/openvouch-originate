export interface Bindings {
  DB?: D1Database
  IDENTITY_PROVIDER_MODE?: string
  VERIFY_PORTAL_BASE_URL?: string
  SHUFTI_CLIENT_ID?: string
  SHUFTI_SECRET?: string
  SHUFTI_BASE_URL?: string
  CALLBACK_URL?: string
}

export type IdentityProviderMode = 'mock' | 'real'

export interface AppConfig {
  identityProviderMode: IdentityProviderMode
  verifyPortalBaseUrl: string
  shuftiClientId: string
  shuftiSecret: string
  shuftiBaseUrl: string
  callbackUrl: string
}

export interface AppEnv {
  Bindings: Bindings
  Variables: {
    config: AppConfig
  }
}

export interface VerifiedIdentity {
  walletAddress: string
  fullName: string
  dob: string
  country: string
  documentNumber?: string
  documentType?: string
  verifiedAt: number
  reference: string
}
