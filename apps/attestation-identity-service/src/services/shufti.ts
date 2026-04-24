import type { AppConfig } from '../types.js'

export async function createShuftiSession(config: AppConfig, reference: string, walletAddress: string, redirectUrl?: string) {
  const auth = btoa(`${config.shuftiClientId}:${config.shuftiSecret}`)
  
  const payload: any = {
    reference,
    callback_url: config.callbackUrl,
    verification_mode: "any",
    allow_offline: "1",
    document: {
      supported_types: ["passport", "id_card", "driving_license"],
      name: "",
      dob: "",
      document_number: "",
      expiry_date: ""
    },
    face: {
      proof: ""
    }
  }

  if (redirectUrl) {
    payload.redirect_url = redirectUrl
  }

  const response = await fetch(config.shuftiBaseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shufti API error: ${response.status} ${errorText}`)
  }

  return await response.json() as { verification_url: string, reference: string }
}

export async function verifyShuftiSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  // 1. Take SHA-256 of the Secret Key
  const secretHash = await sha256(secret)
  
  // 2. Concatenate this hashed secret key to the end of the raw response string
  const toHash = rawBody + secretHash
  
  // 3. Take SHA-256 of the concatenated string
  const computedSignature = await sha256(toHash)
  
  // 4. Compare with the Signature header value
  return computedSignature === signature
}

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
