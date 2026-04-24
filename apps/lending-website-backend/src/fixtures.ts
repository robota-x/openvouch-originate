// Dev/demo fixture data — served by route handlers when the DB binding is absent.
// This is the source of truth for local development and staging previews until real
// user data exists. Matches the shape returned by each API endpoint exactly.
//
// Types are declared inline to avoid a shared-package dependency between backend
// and frontend. Keep field names in sync with what the frontend types.ts expects.

// ── Attestation providers ────────────────────────────────────────────────────

export interface FixtureAttestationProvider {
  id:          string
  name:        string
  wallet:      string
  website:     string
  claimUrl:    string
  description: string
}

export const fixtureAttestationProviders: FixtureAttestationProvider[] = [
  {
    id:          'coinbase-kyc',
    name:        'Coinbase',
    wallet:      'CnbsKYC111111111111111111111111111111111111',
    website:     'https://coinbase.com',
    claimUrl:    'https://coinbase.com/onchain-verify/{address}',
    description: 'Identity verified through Coinbase\'s KYC process, including government-issued ID verification, liveness check, and proof of address.',
  },
  {
    id:          'cred-protocol',
    name:        'Cred Protocol',
    wallet:      'CredScore111111111111111111111111111111111',
    website:     'https://credprotocol.com',
    claimUrl:    'https://credprotocol.com/scores/{address}',
    description: 'On-chain credit score derived from DeFi transaction history, repayment behaviour, wallet age, and cross-protocol activity.',
  },
  {
    id:          'ens',
    name:        'Ethereum Name Service',
    wallet:      'ENsregis111111111111111111111111111111111',
    website:     'https://ens.domains',
    claimUrl:    'https://app.ens.domains/{address}',
    description: 'Ownership of an Ethereum Name Service domain name verified directly from the ENS registry contract.',
  },
  {
    id:          'openzeppelin',
    name:        'OpenZeppelin',
    wallet:      'ZAudit111111111111111111111111111111111111',
    website:     'https://openzeppelin.com',
    claimUrl:    'https://openzeppelin.com/audits/{address}',
    description: 'Security audit of smart contracts associated with this wallet, conducted by OpenZeppelin\'s audit team.',
  },
]

// ── Shared attestation type ──────────────────────────────────────────────────

export interface FixtureAttestation {
  icon:        string
  title:       string
  status:      string
  verified?:   boolean
  providerId?: string
  issuedAt?:   string
  onChainRef?: string
  metadata?:   Record<string, string>
}

// ── Profile and loan types ───────────────────────────────────────────────────

export interface FixtureProfileLoan {
  id:           string
  amount:       number
  currency:     string
  apy:          number
  duration:     number
  status:       'open' | 'active' | 'repaid' | 'defaulted'
  repaid:       number
  dueDate?:     string
  counterparty?: string
}

export interface FixtureLentLoan {
  id:                      string
  borrower:                string
  borrowerNickname:        string
  borrowerTrustScore:      number
  borrowerAttestationCount: number
  borrowerRepaymentRate:   number
  amount:                  number
  currency:                string
  apy:                     number
  duration:                number
  status:                  'active' | 'repaid' | 'defaulted'
  dueDate?:                string
}

export interface FixtureProfile {
  address:      string
  nickname:     string
  trustScore:   number
  attestations: FixtureAttestation[]
  loans:        FixtureProfileLoan[]
  lentLoans?:   FixtureLentLoan[]
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export const fixtureProfiles: Record<string, FixtureProfile> = {
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': {
    address:    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    nickname:   'alice.sol',
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
        metadata: { Domain: 'alice.sol', Registered: '2021-06-12', Expires: '2026-06-12' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true,
        providerId: 'openzeppelin', issuedAt: '2026-01-10',
        onChainRef: '2pQrJvNzXkWmYbFsU9TcHdGaLeKioPxAo4Mu7BjCqDnVtE6RfZgS8YhWpL3NkTs1JeXmFvYuIrBwCqDk5PMoNHA',
        metadata: { Scope: 'Lending Contract v2.1', Findings: '0 critical · 1 medium', Resolution: 'All findings resolved' },
      },
    ],
    lentLoans: [
      {
        id: 'vitalik-1', borrower: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
        borrowerNickname: 'vitalik.sol', borrowerTrustScore: 875,
        borrowerAttestationCount: 4, borrowerRepaymentRate: 100,
        amount: 2000, currency: 'USDC', apy: 9.5, duration: 60,
        status: 'repaid', dueDate: '2025-08-10',
      },
      {
        id: 'whale-1', borrower: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        borrowerNickname: 'defi-whale.sol', borrowerTrustScore: 682,
        borrowerAttestationCount: 3, borrowerRepaymentRate: 62,
        amount: 8000, currency: 'USDC', apy: 10.0, duration: 30,
        status: 'defaulted', dueDate: '2025-11-20',
      },
      {
        id: 'cobie-1', borrower: 'GVV4jHDCHmMfGFLpNKEBBJGgDVtN43B6rRQ5C8tBVFr3',
        borrowerNickname: 'cobie.sol', borrowerTrustScore: 810,
        borrowerAttestationCount: 4, borrowerRepaymentRate: 100,
        amount: 5000, currency: 'USDC', apy: 10.0, duration: 730,
        status: 'repaid', dueDate: '2024-10-05',
      },
      {
        id: 'anon-2', borrower: 'HN7cABqLq46Es1jh92dQQisAi18upCMi8bZNUCEXVi3Y',
        borrowerNickname: 'anon-3439', borrowerTrustScore: 341,
        borrowerAttestationCount: 0, borrowerRepaymentRate: 0,
        amount: 1200, currency: 'USDC', apy: 13.5, duration: 30,
        status: 'active', dueDate: '2026-04-24',
      },
    ],
    loans: [
      { id: 'alice-1', amount: 3000, currency: 'USDC', apy: 11.0, duration: 365, status: 'repaid',    repaid: 3000, dueDate: '2025-05-15', counterparty: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg' },
      { id: 'alice-2', amount: 4500, currency: 'USDC', apy: 12.0, duration: 180, status: 'repaid',    repaid: 4500, dueDate: '2025-09-20', counterparty: 'GVV4jHDCHmMfGFLpNKEBBJGgDVtN43B6rRQ5C8tBVFr3' },
      { id: 'alice-3', amount: 2000, currency: 'USDC', apy: 10.5, duration:  90, status: 'active',    repaid:    0, dueDate: '2026-05-11', counterparty: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
      { id: 'alice-4', amount: 5000, currency: 'USDC', apy: 12.5, duration:  30, status: 'open',      repaid:    0 },
    ],
  },
  'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg': {
    address:    'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
    nickname:   'vitalik.sol',
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
        metadata: { Domain: 'vitalik.sol', Registered: '2019-04-30', Expires: '2027-04-30' },
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
      { id: 'vitalik-1', amount: 2000, currency: 'USDC', apy:  9.5, duration:  60, status: 'repaid', repaid: 2000, dueDate: '2025-08-10', counterparty: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
      { id: 'vitalik-2', amount: 8000, currency: 'USDC', apy:  8.0, duration: 730, status: 'active', repaid:    0, dueDate: '2027-02-20', counterparty: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
      { id: 'vitalik-3', amount: 2500, currency: 'USDC', apy:  9.0, duration: 730, status: 'open',   repaid:    0 },
    ],
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    address:    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    nickname:   'defi-whale.sol',
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
        metadata: { Domain: 'defi-whale.sol', Registered: '2022-11-03', Expires: '2025-11-03' },
      },
      {
        icon: 'security', title: 'OpenZeppelin Audit', status: 'Audited 2025', verified: true,
        providerId: 'openzeppelin', issuedAt: '2025-12-18',
        onChainRef: 'DtOfMrZVYlXnAbHsW9UdOeGbMfLjPyQDp6Nv8EkDrEoWtF4SgAtT9ZiXqM5OlUs3KfYnGwZvJsBxDrElDPNoIE',
        metadata: { Scope: 'Vault Contract v3.2', Findings: '0 critical · 3 medium', Resolution: 'All findings resolved' },
      },
    ],
    loans: [
      { id: 'whale-1', amount:  8000, currency: 'USDC', apy: 10.0, duration:  30, status: 'defaulted', repaid:    0, dueDate: '2025-11-20', counterparty: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
      { id: 'whale-2', amount:  5000, currency: 'USDC', apy: 11.5, duration: 120, status: 'repaid',    repaid: 5000, dueDate: '2025-07-05', counterparty: 'GVV4jHDCHmMfGFLpNKEBBJGgDVtN43B6rRQ5C8tBVFr3' },
      { id: 'whale-3', amount: 10000, currency: 'USDC', apy: 11.0, duration: 120, status: 'open',      repaid:    0 },
    ],
  },
  'HN7cABqLq46Es1jh92dQQisAi18upCMi8bZNUCEXVi3Y': {
    address:    'HN7cABqLq46Es1jh92dQQisAi18upCMi8bZNUCEXVi3Y',
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
      { id: 'anon-1', amount: 1000, currency: 'USDC', apy: 15.0, duration:  90, status: 'defaulted', repaid:    0, dueDate: '2025-06-15', counterparty: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg' },
      { id: 'anon-2', amount: 1200, currency: 'USDC', apy: 13.5, duration:  30, status: 'active',    repaid:    0, dueDate: '2026-04-24', counterparty: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
      { id: 'anon-3', amount: 1500, currency: 'USDC', apy: 14.0, duration:   7, status: 'open',      repaid:    0 },
    ],
  },
  'GVV4jHDCHmMfGFLpNKEBBJGgDVtN43B6rRQ5C8tBVFr3': {
    address:    'GVV4jHDCHmMfGFLpNKEBBJGgDVtN43B6rRQ5C8tBVFr3',
    nickname:   'cobie.sol',
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
        metadata: { Domain: 'cobie.sol', Registered: '2023-02-18', Expires: '2028-02-18' },
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
      { id: 'cobie-1', amount: 5000, currency: 'USDC', apy: 10.0, duration: 730, status: 'repaid', repaid: 5000, dueDate: '2024-10-05', counterparty: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
      { id: 'cobie-2', amount: 6000, currency: 'USDC', apy: 10.5, duration: 180, status: 'active', repaid:    0, dueDate: '2026-05-30', counterparty: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg' },
      { id: 'cobie-3', amount: 7500, currency: 'USDC', apy: 10.5, duration: 365, status: 'open',   repaid:    0 },
    ],
  },
}

// ── Open loan requests (marketplace listing) ─────────────────────────────────
// Derived from profiles: open loans enriched with computed borrower stats.

export interface FixtureLoan {
  id:               string
  borrower:         string
  nickname:         string
  amount:           number
  currency:         string
  apy:              number
  duration:         number
  trustScore:       number
  repaymentRate:    number
  attestationCount: number
}

function computeRepaymentRate(address: string): number {
  const loans = fixtureProfiles[address]?.loans.filter(l => l.status !== 'open') ?? []
  if (!loans.length) return 100
  const borrowed = loans.reduce((s, l) => s + l.amount, 0)
  const repaid   = loans.reduce((s, l) => s + l.repaid,  0)
  return Math.round(repaid / borrowed * 100)
}

function computeAttestationCount(address: string): number {
  return fixtureProfiles[address]?.attestations.filter(a => a.verified !== false).length ?? 0
}

export const fixtureOpenLoans: FixtureLoan[] = Object.values(fixtureProfiles)
  .flatMap(p => p.loans.filter(l => l.status === 'open').map(l => ({
    id:               l.id,
    borrower:         p.address,
    nickname:         p.nickname,
    amount:           l.amount,
    currency:         l.currency,
    apy:              l.apy,
    duration:         l.duration,
    trustScore:       p.trustScore,
    repaymentRate:    computeRepaymentRate(p.address),
    attestationCount: computeAttestationCount(p.address),
  })))

// ── Contract detail view (single loan) ───────────────────────────────────────

export interface FixtureContractView {
  id:                       string
  borrower:                 string
  borrowerNickname:         string
  borrowerTrustScore:       number
  borrowerAttestationCount: number
  borrowerRepaymentRate:    number
  lender?:                  string
  amount:                   number
  currency:                 string
  apy:                      number
  duration:                 number
  status:                   'open' | 'active' | 'repaid' | 'defaulted'
  dueDate?:                 string
}

/** Look up a loan by id across all fixture profiles and return the ContractView shape. */
export function fixtureContractView(id: string): FixtureContractView | null {
  for (const p of Object.values(fixtureProfiles)) {
    const loan = p.loans.find(l => l.id === id)
    if (!loan) continue
    return {
      id:                       loan.id,
      borrower:                 p.address,
      borrowerNickname:         p.nickname,
      borrowerTrustScore:       p.trustScore,
      borrowerAttestationCount: computeAttestationCount(p.address),
      borrowerRepaymentRate:    computeRepaymentRate(p.address),
      lender:                   loan.counterparty,
      amount:                   loan.amount,
      currency:                 loan.currency,
      apy:                      loan.apy,
      duration:                 loan.duration,
      status:                   loan.status,
      dueDate:                  loan.dueDate,
    }
  }
  return null
}
