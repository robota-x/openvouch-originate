import type { Profile, ProfileLoan, ContractView } from '../types'
import { toLamports } from './precision'

/** Build a ContractView from a ProfileLoan and the borrower's profile. */
export function profileLoanToContractView(loan: ProfileLoan, profile: Profile): ContractView {
  const settled       = profile.loans.filter(l => l.status === 'repaid' || l.status === 'defaulted')
  const borrowed      = settled.reduce((s, l) => s + toLamports(l.amount), 0n)
  const repaid        = settled.reduce((s, l) => s + toLamports(l.repaid),  0n)
  const repaymentRate = borrowed > 0n ? Number((repaid * 100n) / borrowed) : 100

  return {
    id:                       loan.id,
    borrower:                 profile.address,
    borrowerNickname:         profile.nickname,
    borrowerTrustScore:       profile.trustScore,
    borrowerAttestationCount: profile.attestations.filter(a => a.verified !== false).length,
    borrowerRepaymentRate:    repaymentRate,
    lender:                   loan.counterparty,
    amount:                   loan.amount,
    currency:                 loan.currency,
    apy:                      loan.apy,
    duration:                 loan.duration,
    status:                   loan.status,
    dueDate:                  loan.dueDate,
  }
}
