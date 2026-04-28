import type { VerifiedIdentity } from '../types.js'

/**
 * Workers-safe in-memory identity registry.
 *
 * We intentionally avoid node:fs/process here because this service runs on
 * Cloudflare Workers where filesystem access is unavailable. For the hackathon
 * mock flow we only need a lightweight process-local cache.
 */
const identityRegistry = new Map<string, VerifiedIdentity>()

export async function saveIdentity(identity: VerifiedIdentity): Promise<void> {
  identityRegistry.set(identity.walletAddress.toLowerCase(), identity)
}

export async function getIdentity(walletAddress: string): Promise<VerifiedIdentity | null> {
  return identityRegistry.get(walletAddress.toLowerCase()) ?? null
}
