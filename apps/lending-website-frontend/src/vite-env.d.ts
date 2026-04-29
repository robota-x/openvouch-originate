/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_IDENTITY_API_BASE_URL: string
  readonly VITE_ATTESTATION_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
