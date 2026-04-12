import type { Loan, AttestationProvider, Profile } from '../types'

// ── Attestation providers ─────────────────────────────────────────────────────
// Mirrors GET /api/attestation-providers.
// claimUrl: "{address}" is replaced with the subject wallet address at display time.

export const attestationProviders: AttestationProvider[] = [
  {
    id:          'coinbase-kyc',
    name:        'Coinbase',
    wallet:      '0xcb0000000000000000000000000000000000cb01',
    website:     'https://coinbase.com',
    claimUrl:    'https://coinbase.com/onchain-verify/{address}',
    description: 'Identity verified through Coinbase\'s KYC process, including government-issued ID verification, liveness check, and proof of address.',
  },
  {
    id:          'cred-protocol',
    name:        'Cred Protocol',
    wallet:      '0xce0000000000000000000000000000000000ce01',
    website:     'https://credprotocol.com',
    claimUrl:    'https://credprotocol.com/scores/{address}',
    description: 'On-chain credit score derived from DeFi transaction history, repayment behaviour, wallet age, and cross-protocol activity.',
  },
  {
    id:          'ens',
    name:        'Ethereum Name Service',
    wallet:      '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85',
    website:     'https://ens.domains',
    claimUrl:    'https://app.ens.domains/{address}',
    description: 'Ownership of an Ethereum Name Service domain name verified directly from the ENS registry contract.',
  },
  {
    id:          'openzeppelin',
    name:        'OpenZeppelin',
    wallet:      '0x0a110000000000000000000000000000000a1101',
    website:     'https://openzeppelin.com',
    claimUrl:    'https://openzeppelin.com/audits/{address}',
    description: 'Security audit of smart contracts associated with this wallet, conducted by OpenZeppelin\'s audit team.',
  },
]

// ── Profile fixtures ─────────────────────────────────────────────────────────
export const profiles: Record<string, Profile> = {
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F': {
    address:    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    nickname:   'alice.eth',
    trustScore: 920,
    attestations: [
      {
        icon: 'account_balance', title: 'Coinbase KYC', status: 'Verified', verified: true,
        providerId: 'coinbase-kyc', issuedAt: '2025-01-15',
        onChainRef: '5KtPn1LGuxhFDFHQGiSbFNqJLhFCjkiQLFtTsmfHzEBLCLMoqQvuF1P8TSMzRrFt3XpvMPHZpHKyomJsFk4P7YLg',
        metadata: { Jurisdiction: 'United States', Checks: 'ID · Liveness · Address', Level: 'Enhanced KYC' },
      },
      {
        icon: 'monitoring', title: 'Cred Protocol', status: 'Score: 850', verified: true,
        providerId: 'cred-protocol', issuedAt: '2025-09-01',
        onChainRef: '3nVfYFVLQdMgRk1xZouaW4N9dZS7XLjkNQGa3VQYhMvTw8nJrPqXfHsUe5KbAm6DoCxZtYrJwE2FhKqPL9DMRSN',
        metadata: { Score: '850 / 1000', Percentile: 'Top 8%', 'History span': '24 months' },
      },
      {
        icon: 'language', title: 'ENS Domain', status: 'Verified', verified: true,
        providerId: 'ens', issuedAt: '2021-06-12',
        onChainRef: '4mXbKqzPZvL8JfYRtU6NdCwTsVeHpGiAoE3Mx9bDQnKuF7WjBcXrZgP2YhSvN1LkTd5aFmJqEuWi8RoCpHs3YVA',
        metadata: { Domain: 'alice.eth', Registered: '2021-06-12', Expires: '2026-06-12' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true,
        providerId: 'openzeppelin', issuedAt: '2026-01-10',
        onChainRef: '2pQrJvNzXkWmYbFsU9TcHdGaLeKioPxAo4Mu7BjCqDnVtE6RfZgS8YhWpL3NkTs1JeXmFvYuIrBwCqDk5PMoNHA',
        metadata: { Scope: 'Lending Contract v2.1', Findings: '0 critical · 1 medium', Resolution: 'All findings resolved' },
      },
    ],
    loans: [
      { id: 'alice-1', amount: 3000, currency: 'USDC', apy: 11.0, duration: 365, status: 'closed', repaid: 3000, dueDate: '2025-05-15', counterparty: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
      { id: 'alice-2', amount: 4500, currency: 'USDC', apy: 12.0, duration: 180, status: 'closed', repaid: 4500, dueDate: '2025-09-20', counterparty: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4' },
      { id: 'alice-3', amount: 2000, currency: 'USDC', apy: 10.5, duration:  90, status: 'active', repaid:    0, dueDate: '2026-05-11', counterparty: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' },
      { id: 'alice-4', amount: 5000, currency: 'USDC', apy: 12.5, duration:  30, status: 'open',   repaid:    0 },
    ],
  },
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045': {
    address:    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    nickname:   'vitalik.eth',
    trustScore: 875,
    attestations: [
      {
        icon: 'account_balance', title: 'Coinbase KYC', status: 'Verified', verified: true,
        providerId: 'coinbase-kyc', issuedAt: '2024-08-20',
        onChainRef: '67KjWvMpQnXbL3TsR9UoFdHcNaZeYiPxEg2As5BtCmVkuD8WjLfXrYqP4NhSvK1MoTd6bJeGpFuZwRyCqDk7PMoN',
        metadata: { Jurisdiction: 'European Union', Checks: 'ID · Liveness · Address', Level: 'Standard KYC' },
      },
      {
        icon: 'language', title: 'ENS Domain', status: 'Verified', verified: true,
        providerId: 'ens', issuedAt: '2019-04-30',
        onChainRef: '8nBcKpzRXvL2JfWqU5TdGwMsVfHaGiAoE7Mx4bDQmKuF3YjCcXrZgP6NhSvN9LkTd1aFmJqEuWi2RoCpHs5YVB',
        metadata: { Domain: 'vitalik.eth', Registered: '2019-04-30', Expires: '2027-04-30' },
      },
      {
        icon: 'monitoring', title: 'Cred Protocol', status: 'Score: 810', verified: true,
        providerId: 'cred-protocol', issuedAt: '2025-11-01',
        onChainRef: '9pTdLqzSXkWmYbGsU8RcNdFaLeKioPxBo3Mu6CjCqDnVtE4RfZgS7YhWpL2NkTs9JeXmFvYuIrBwCqDk3PMoNHB',
        metadata: { Score: '810 / 1000', Percentile: 'Top 15%', 'History span': '24 months' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true,
        providerId: 'openzeppelin', issuedAt: '2026-02-05',
        onChainRef: 'AqNcJvPzXkWmYbFsU9TcHdGaLeKioPxAo4Mu7BjCqDnVtE6RfZgS8YhWpL3NkTs1JeXmFvYuIrBwCqDkAPMoNHC',
        metadata: { Scope: 'Bridge Contract v1.0', Findings: '0 critical · 0 medium', Resolution: 'N/A' },
      },
    ],
    loans: [
      { id: 'vitalik-1', amount: 2000, currency: 'USDC', apy:  9.5, duration:  60, status: 'closed', repaid: 2000, dueDate: '2025-08-10', counterparty: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      { id: 'vitalik-2', amount: 8000, currency: 'USDC', apy:  8.0, duration: 730, status: 'active', repaid:    0, dueDate: '2027-02-20', counterparty: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B' },
      { id: 'vitalik-3', amount: 2500, currency: 'USDC', apy:  9.0, duration: 730, status: 'open',   repaid:    0 },
    ],
  },
  '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B': {
    address:    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    nickname:   'defi-whale.eth',
    trustScore: 682,
    attestations: [
      {
        icon: 'monitoring', title: 'Cred Protocol', status: 'Score: 720', verified: true,
        providerId: 'cred-protocol', issuedAt: '2025-07-15',
        onChainRef: 'BrMdKpzTXvL4JfYRtU7NdCwSsVeHpGiAoE5Mx8bDQnKuF9WjBcXrZgP3YhSvN2LkTd4aFmJqEuWi7RoCpHsBYVC',
        metadata: { Score: '720 / 1000', Percentile: 'Top 28%', 'History span': '18 months' },
      },
      {
        icon: 'language', title: 'ENS Domain', status: 'Verified', verified: true,
        providerId: 'ens', issuedAt: '2022-11-03',
        onChainRef: 'CsNeLqzUXkWmZbGsV8TcNdFaLeKioPxCo5Mu7DjCqDnVtE3RfZgS6YhWpL4NkTs2JeXmFvYuIrBwCqDkCPMoNHD',
        metadata: { Domain: 'defi-whale.eth', Registered: '2022-11-03', Expires: '2025-11-03' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Audited 2025', verified: true,
        providerId: 'openzeppelin', issuedAt: '2025-12-18',
        onChainRef: 'DtOfMrZVYlXnAbHsW9UdOeGbMfLjPyQDp6Nv8EkDrEoWtF4SgAtT9ZiXqM5OlUs3KfYnGwZvJsBxDrElDPNoIE',
        metadata: { Scope: 'Vault Contract v3.2', Findings: '0 critical · 3 medium', Resolution: 'All findings resolved' },
      },
    ],
    loans: [
      { id: 'whale-1', amount:  8000, currency: 'USDC', apy: 10.0, duration:  30, status: 'closed', repaid:    0, dueDate: '2025-11-20', counterparty: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      { id: 'whale-2', amount:  5000, currency: 'USDC', apy: 11.5, duration: 120, status: 'closed', repaid: 5000, dueDate: '2025-07-05', counterparty: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4' },
      { id: 'whale-3', amount: 10000, currency: 'USDC', apy: 11.0, duration: 120, status: 'open',   repaid:    0 },
    ],
  },
  '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6': {
    address:    '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6',
    nickname:   'anon-3439',
    trustScore: 341,
    attestations: [
      {
        icon: 'language', title: 'ENS Domain', status: 'Unverified', verified: false,
        providerId: 'ens', issuedAt: '2024-11-05',
        metadata: { Domain: 'anon-3439.eth', 'Reverse record': 'Not set' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Pending', verified: false,
        providerId: 'openzeppelin', issuedAt: '2026-03-20',
        metadata: { Scope: 'Borrowing Contract v1.0', Status: 'In review', ETA: 'Q2 2026' },
      },
    ],
    loans: [
      { id: 'anon-1', amount: 1000, currency: 'USDC', apy: 15.0, duration:  90, status: 'closed', repaid:    0, dueDate: '2025-06-15', counterparty: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
      { id: 'anon-2', amount: 1200, currency: 'USDC', apy: 13.5, duration:  30, status: 'active', repaid:    0, dueDate: '2026-04-24', counterparty: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      { id: 'anon-3', amount: 1500, currency: 'USDC', apy: 14.0, duration:   7, status: 'open',   repaid:    0 },
    ],
  },
  '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4': {
    address:    '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
    nickname:   'cobie.base',
    trustScore: 810,
    attestations: [
      {
        icon: 'account_balance', title: 'Coinbase KYC', status: 'Verified', verified: true,
        providerId: 'coinbase-kyc', issuedAt: '2024-05-10',
        onChainRef: 'EuPgNsAWZmYoAbItX8VeOfHcNgMkQzREc7Ow9FlEsDpXuG5ThBuU9AjYrN6PmVt4LgZoHxAwKtCyEsFmEQOpJF',
        metadata: { Jurisdiction: 'Australia', Checks: 'ID · Liveness · Address', Level: 'Standard KYC' },
      },
      {
        icon: 'language', title: 'ENS Domain', status: 'Verified', verified: true,
        providerId: 'ens', issuedAt: '2023-02-18',
        onChainRef: 'FvQhOtBXAnZpBbJuY9WfPgIdOiNlRASfd8Px9GmFtEqYvH6UiCvV9BkZsO7QnWu5MhApIyBxLuDzFtGnFROkG',
        metadata: { Domain: 'cobie.base', Registered: '2023-02-18', Expires: '2028-02-18' },
      },
      {
        icon: 'monitoring', title: 'Cred Protocol', status: 'Score: 790', verified: true,
        providerId: 'cred-protocol', issuedAt: '2025-10-22',
        onChainRef: 'GwRiPuCYBoApCcKvZ8XgQhJeOjOmSBTge9QyAHnGuFrZwI7VjDwW9ClAtP8RoXv6NiAqJzCyMvEAGuHoGSPlH',
        metadata: { Score: '790 / 1000', Percentile: 'Top 17%', 'History span': '30 months' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true,
        providerId: 'openzeppelin', issuedAt: '2026-03-01',
        onChainRef: 'HxSjQvDZCpBqDdLwA9YhRiKfPkPnTCUhfARzBIoHvGsAxJ8WkExX9DmBuQ9SpYw7OjBrKADzNwFBHvIpHTQmI',
        metadata: { Scope: 'Staking Contract v1.4', Findings: '0 critical · 0 medium', Resolution: 'N/A' },
      },
    ],
    loans: [
      { id: 'cobie-1', amount: 5000, currency: 'USDC', apy: 10.0, duration: 730, status: 'closed', repaid: 5000, dueDate: '2024-10-05', counterparty: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
      { id: 'cobie-2', amount: 6000, currency: 'USDC', apy: 10.5, duration: 180, status: 'active', repaid:    0, dueDate: '2026-05-30', counterparty: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
      { id: 'cobie-3', amount: 7500, currency: 'USDC', apy: 10.5, duration: 365, status: 'open',   repaid:    0 },
    ],
  },
}

// ── Helpers: compute marketplace fields from profile data ────────────────────

function computeRepaymentRate(address: string): number {
  const loans = profiles[address]?.loans.filter(l => l.status !== 'open') ?? []
  if (!loans.length) return 100
  const borrowed = loans.reduce((s, l) => s + l.amount, 0)
  const repaid   = loans.reduce((s, l) => s + l.repaid,  0)
  return Math.round(repaid / borrowed * 100)
}

function computeAttestationCount(address: string): number {
  return profiles[address]?.attestations.filter(a => a.verified !== false).length ?? 0
}

// ── Open loan requests (marketplace listing) ─────────────────────────────────
export const openRequests: Loan[] = [
  {
    borrower:         '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    nickname:         'alice.eth',
    amount:           5000,
    currency:         'USDC',
    apy:              12.5,
    duration:         30,
    trustScore:       920,
    repaymentRate:    computeRepaymentRate('0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
    attestationCount: computeAttestationCount('0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
  },
  {
    borrower:         '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    nickname:         'vitalik.eth',
    amount:           2500,
    currency:         'USDC',
    apy:              9.0,
    duration:         730,
    trustScore:       875,
    repaymentRate:    computeRepaymentRate('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'),
    attestationCount: computeAttestationCount('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'),
  },
  {
    borrower:         '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    nickname:         'defi-whale.eth',
    amount:           10000,
    currency:         'USDC',
    apy:              11.0,
    duration:         120,
    trustScore:       682,
    repaymentRate:    computeRepaymentRate('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'),
    attestationCount: computeAttestationCount('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'),
  },
  {
    borrower:         '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6',
    nickname:         'anon-3439',
    amount:           1500,
    currency:         'USDC',
    apy:              14.0,
    duration:         7,
    trustScore:       341,
    repaymentRate:    computeRepaymentRate('0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6'),
    attestationCount: computeAttestationCount('0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6'),
  },
  {
    borrower:         '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
    nickname:         'cobie.base',
    amount:           7500,
    currency:         'USDC',
    apy:              10.5,
    duration:         365,
    trustScore:       810,
    repaymentRate:    computeRepaymentRate('0x5B38Da6a701c568545dCfcB03FcB875f56beddC4'),
    attestationCount: computeAttestationCount('0x5B38Da6a701c568545dCfcB03FcB875f56beddC4'),
  },
]
