const OTP_TTL_MS = 15 * 60 * 1000 // 15 minutes

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function otpExpiry(): number {
  return Date.now() + OTP_TTL_MS
}

export function isOtpValid(otp: string, stored: string, expiresAt: number): boolean {
  return otp === stored && Date.now() < expiresAt
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  companyName: string,
  config: { sendgridKey: string | undefined; emailFrom: string },
): Promise<void> {
  if (!config.sendgridKey) {
    // Dev mode — log OTP to console instead of sending
    console.log(`\n┌─────────────────────────────────────────┐`)
    console.log(`│  OTP EMAIL (dev mode — not sent)        │`)
    console.log(`│  To:      ${to.padEnd(29)}│`)
    console.log(`│  From:    ${config.emailFrom.substring(0, 29).padEnd(29)}│`)
    console.log(`│  Company: ${companyName.substring(0, 29).padEnd(29)}│`)
    console.log(`│  OTP:     ${otp.padEnd(29)}│`)
    console.log(`└─────────────────────────────────────────┘\n`)
    return
  }

  // Production: nodemailer SMTP is not Workers-compatible (TCP).
  // TODO: replace with SendGrid HTTP API before deploying to production Workers.
  throw new Error('Production email sending is not yet implemented for Cloudflare Workers')
}
