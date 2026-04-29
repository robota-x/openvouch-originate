import { describe, it, expect } from 'vitest'
import { buildConfig } from './config.js'
import type { Bindings } from './types.js'

describe('buildConfig', () => {
  it('throws when COMPANIES_HOUSE_UK_API_KEY is missing', () => {
    expect(() => buildConfig(undefined)).toThrow(/COMPANIES_HOUSE_UK_API_KEY/)
  })

  it('applies defaults for optional values', () => {
    const config = buildConfig({ COMPANIES_HOUSE_UK_API_KEY: 'key' } as Bindings)
    expect(config.companiesHouseUkApiKey).toBe('key')
    expect(config.identityServiceUrl).toBe('http://localhost:8789')
  })

  it('uses provided optional values', () => {
    const config = buildConfig({
      COMPANIES_HOUSE_UK_API_KEY: 'key',
      IDENTITY_SERVICE_URL: 'https://identity.example.com',
    } as Bindings)

    expect(config).toEqual({
      companiesHouseUkApiKey: 'key',
      identityServiceUrl: 'https://identity.example.com',
    })
  })
})
