import type { Profile, ProfileLoan, ContractView } from '../types'

/** Build a ContractView from a ProfileLoan and the borrower's profile. */
export function profileLoanToContractView(loan: ProfileLoan, profile: Profile): ContractView {
  const settled       = profile.loans.filter(l => l.status === 'repaid' || l.status === 'defaulted')
  // amount and repaid are already lamport strings from the API — BigInt directly, no conversion
  const borrowed      = settled.reduce((s, l) => s + BigInt(l.amount), 0n)
  const repaid        = settled.reduce((s, l) => s + BigInt(l.repaid),  0n)
  // ContractModal expects BPS (0–10000), same as the marketplace API
  const repaymentRate = borrowed > 0n ? Number((repaid * 10000n) / borrowed) : 10000

  return {
    id:                       loan.id,
    borrower:                 profile.address,
    borrowerNickname:         profile.nickname,
    borrowerTrustScore:       profile.trustScore,
    borrowerAttestationCount: profile.attestations.filter(a => a.verified !== false).length,
    borrowerRepaymentRate:    repaymentRate,
    lender:                   loan.counterparty,
    amount:                   loan.amount,
    raisedAmount:             loan.raisedAmount,
    currency:                 loan.currency,
    apy:                      loan.apy,
    duration:                 loan.duration,
    status:                   loan.status,
    dueDate:                  loan.dueDate,
  }
}
