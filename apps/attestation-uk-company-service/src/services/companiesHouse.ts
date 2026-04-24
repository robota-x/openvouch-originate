import type { CompanyDetails, Director } from '../types.js'

const BASE_URL = 'https://api.company-information.service.gov.uk'

function authHeader(apiKey: string): string {
  // Companies House uses API key as username with empty password (Basic Auth)
  return `Basic ${btoa(`${apiKey}:`)}`
}

async function chFetch(path: string, apiKey: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader(apiKey) },
  })
}

export async function getCompany(companyNumber: string, apiKey: string): Promise<CompanyDetails> {
  const res = await chFetch(`/company/${companyNumber}`, apiKey)
  if (res.status === 404) throw new Error('company_not_found')
  if (!res.ok) throw new Error(`ch_api_error:${res.status}`)

  const data = await res.json() as Record<string, unknown>
  const directors = await getActiveDirectors(companyNumber, apiKey)

  return {
    companyNumber,
    companyName: data['company_name'] as string,
    status: data['company_status'] as string,
    registeredOfficeAddress: (data['registered_office_address'] ?? {}) as Record<string, string>,
    directors,
  }
}

export async function getActiveDirectors(companyNumber: string, apiKey: string): Promise<Director[]> {
  const res = await chFetch(`/company/${companyNumber}/officers?items_per_page=100`, apiKey)
  if (!res.ok) throw new Error(`ch_api_error:${res.status}`)

  const data = await res.json() as { items?: Array<Record<string, unknown>> }
  const items = data.items ?? []

  return items
    .filter((o) => !o['resigned_on'])
    .map((o) => ({
      name: o['name'] as string,
      role: o['officer_role'] as string,
      appointedOn: (o['appointed_on'] as string) ?? '',
    }))
}

export function directorNameMatches(claimedName: string, directors: Director[]): boolean {
  const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const claimed = normalise(claimedName)
  return directors.some((d) => normalise(d.name).includes(claimed) || claimed.includes(normalise(d.name)))
}
