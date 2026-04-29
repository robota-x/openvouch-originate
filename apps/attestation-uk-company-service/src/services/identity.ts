export interface IdentityInfo {
  fullName: string
  dob: string
  country: string
  verifiedAt: number
}

export interface IdentityProvider {
  getIdentity(walletAddress: string): Promise<IdentityInfo | null>
}

export class ApiIdentityProvider implements IdentityProvider {
  constructor(private baseUrl: string) {}

  async getIdentity(walletAddress: string): Promise<IdentityInfo | null> {
    const url = `${this.baseUrl}/identity/${walletAddress}`
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) {
        throw new Error(`Identity service returned ${res.status}`)
      }
      const data = await res.json() as { verified: boolean; identity: IdentityInfo }
      return data.verified ? data.identity : null
    } catch (err) {
      console.error('Failed to fetch identity:', err)
      throw new Error('identity_service_unavailable')
    }
  }
}
