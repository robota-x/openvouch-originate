import type { Loan, Profile } from '../types'

// Reference date for "today" in mocks: 2026-04-12
// Active loan dueDates are in the future; closed dueDates are in the past.
// Repaid is either 0 (not repaid / defaulted) or the full loan amount — no partials.
// Duration spread: 7d · 30d · 60d · 90d · 120d · 180d · 365d · 730d

// ── Profile fixtures ─────────────────────────────────────────────────────────
export const profiles: Record<string, Profile> = {
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F': {
    address:    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    nickname:   'alice.eth',
    trustScore: 920,
    attestations: [
      { icon: 'account_balance', title: 'Coinbase KYC',       status: 'Verified',     verified: true },
      { icon: 'monitoring',      title: 'Cred Protocol',      status: 'Score: 850',   verified: true },
      { icon: 'language',        title: 'ENS Domain',         status: 'Verified',     verified: true },
      { icon: 'security',        title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true },
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
      { icon: 'account_balance', title: 'Coinbase KYC',       status: 'Verified',     verified: true },
      { icon: 'language',        title: 'ENS Domain',         status: 'Verified',     verified: true },
      { icon: 'monitoring',      title: 'Cred Protocol',      status: 'Score: 810',   verified: true },
      { icon: 'security',        title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true },
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
      { icon: 'monitoring', title: 'Cred Protocol',      status: 'Score: 720',   verified: true },
      { icon: 'language',   title: 'ENS Domain',         status: 'Verified',     verified: true },
      { icon: 'security',   title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true },
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
      { icon: 'language', title: 'ENS Domain',         status: 'Unverified', verified: false },
      { icon: 'security', title: 'OpenZeppelin Audit', status: 'Pending',    verified: false },
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
      { icon: 'account_balance', title: 'Coinbase KYC',       status: 'Verified',     verified: true },
      { icon: 'language',        title: 'ENS Domain',         status: 'Verified',     verified: true },
      { icon: 'monitoring',      title: 'Cred Protocol',      status: 'Score: 790',   verified: true },
      { icon: 'security',        title: 'OpenZeppelin Audit', status: 'Audited 2026', verified: true },
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
