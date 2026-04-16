import type { Session, Attestation } from '../types.js'

// In-memory stores — sufficient for hackathon demo.
// In production these would be a database.

const sessions = new Map<string, Session>()
const attestations = new Map<string, Attestation>() // keyed by walletAddress

export const sessionStore = {
  set(session: Session): void {
    sessions.set(session.id, session)
  },
  get(id: string): Session | undefined {
    return sessions.get(id)
  },
  update(id: string, patch: Partial<Session>): Session | undefined {
    const existing = sessions.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...patch }
    sessions.set(id, updated)
    return updated
  },
}

export const attestationStore = {
  set(attestation: Attestation): void {
    attestations.set(attestation.walletAddress, attestation)
  },
  getByWallet(walletAddress: string): Attestation | undefined {
    return attestations.get(walletAddress)
  },
  exists(walletAddress: string): boolean {
    return attestations.has(walletAddress)
  },
}
