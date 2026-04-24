import fs from 'node:fs/promises'
import path from 'node:path'
import type { VerifiedIdentity } from '../types.js'

const CACHE_FILE = path.join(process.cwd(), '.identity-cache.json')

export async function saveIdentity(identity: VerifiedIdentity): Promise<void> {
  const data = await loadAllIdentities()
  data[identity.walletAddress.toLowerCase()] = identity
  await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2))
}

export async function getIdentity(walletAddress: string): Promise<VerifiedIdentity | null> {
  const data = await loadAllIdentities()
  return data[walletAddress.toLowerCase()] || null
}

async function loadAllIdentities(): Promise<Record<string, VerifiedIdentity>> {
  try {
    const content = await fs.readFile(CACHE_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    return {}
  }
}
