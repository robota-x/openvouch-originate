import { describe, it, expect } from 'vitest'
import { buildConfig } from './config.js'
import type { Bindings } from './types.js'

describe('buildConfig', () => {
  it('throws when CH_API_KEY is missing', () => {
    expect(() => buildConfig(undefined)).toThrow(/CH_API_KEY/)
  })

  it('applies defaults for optional values', () => {
    const config = buildConfig({ CH_API_KEY: 'key' } as Bindings)
    expect(config.chApiKey).toBe('key')
    expect(config.sendgridKey).toBeUndefined()
    expect(config.emailFrom).toBe('noreply@openvouch.io')
  })

  it('uses provided optional values', () => {
    const config = buildConfig({
      CH_API_KEY: 'key',
      SENDGRID_KEY: 'sg',
      EMAIL_FROM: 'ops@openvouch.io',
    } as Bindings)

    expect(config).toEqual({
      chApiKey: 'key',
      sendgridKey: 'sg',
      emailFrom: 'ops@openvouch.io',
    })
  })
})
