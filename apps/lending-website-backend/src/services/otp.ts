import { createTransport } from 'nodemailer'

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

export async function sendOtpEmail(to: string, otp: string, companyName: string): Promise<void> {
  const isDev = !process.env.SENDGRID_KEY

  if (isDev) {
    // Hackathon dev mode — log OTP to console instead of sending
    console.log(`\n┌─────────────────────────────────────────┐`)
    console.log(`│  OTP EMAIL (dev mode — not sent)        │`)
    console.log(`│  To:      ${to.padEnd(29)}│`)
    console.log(`│  Company: ${companyName.substring(0, 29).padEnd(29)}│`)
    console.log(`│  OTP:     ${otp.padEnd(29)}│`)
    console.log(`└─────────────────────────────────────────┘\n`)
    return
  }

  // Production: send via SMTP relay (Sendgrid compatible)
  const transport = createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: { user: 'apikey', pass: process.env.SENDGRID_KEY },
  })

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@openvouch.io',
    to,
    subject: `Your OpenVouch verification code`,
    text: `Your one-time verification code for ${companyName} is: ${otp}\n\nThis code expires in 15 minutes.`,
  })
}


