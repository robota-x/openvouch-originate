import { afterEach, describe, expect, it, vi } from 'vitest'
import { directorNameMatches, getActiveDirectors, getCompany } from './companiesHouse.js'

afterEach(() => vi.unstubAllGlobals())

describe('getCompany', () => {
  it('maps company and active directors fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        company_name: 'Acme Ltd',
        company_status: 'active',
        registered_office_address: { line_1: 'Somewhere' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [
          {
            name: 'Ada Lovelace',
            officer_role: 'director',
            appointed_on: '2020-01-01',
            date_of_birth: { year: 1815, month: 12 },
            nationality: 'GB',
          },
          { name: 'Grace Hopper', officer_role: 'director', resigned_on: '2022-01-01' },
        ],
      }), { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)
    const company = await getCompany('12345678', 'api-key')

    expect(company).toEqual({
      companyNumber: '12345678',
      companyName: 'Acme Ltd',
      status: 'active',
      registeredOfficeAddress: { line_1: 'Somewhere' },
      directors: [{
        name: 'Ada Lovelace',
        role: 'director',
        appointedOn: '2020-01-01',
        dob: '1815-12-01',
        country: 'GB',
      }],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws company_not_found on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(getCompany('12345678', 'api-key')).rejects.toThrow('company_not_found')
  })
})

describe('getActiveDirectors', () => {
  it('throws ch_api_error when upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    await expect(getActiveDirectors('12345678', 'api-key')).rejects.toThrow('ch_api_error:503')
  })
})

describe('directorNameMatches', () => {
  it('matches case-insensitively with normalized whitespace', () => {
    const directors = [{ name: 'Ada   Lovelace', role: 'director', appointedOn: 'x', dob: '1815-12-01', country: 'GB' }]
    expect(directorNameMatches('  ada lovelace ', directors)).toBe(true)
  })

  it('returns false when no director name matches', () => {
    const directors = [{ name: 'Alan Turing', role: 'director', appointedOn: 'x', dob: '1912-06-01', country: 'GB' }]
    expect(directorNameMatches('Ada Lovelace', directors)).toBe(false)
  })
})
