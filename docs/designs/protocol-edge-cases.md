# Protocol Edge Cases & Resolutions

This document outlines the protocol's handling of deadlocks, vulnerabilities, and edge cases. All resolutions described below are implemented in the OpenVouch Smart Contract and verified via behavioral tests.

## Comprehensive Edge Case Matrix

| Scenario | Status | Resolution |
| :--- | :--- | :--- |
| **1. Target Not Reached** | ✅ Resolved | Borrower can call `cancel_loan` after a 7-day funding window. Status becomes `Cancelled`. |
| **2. Funding Stalled** | ✅ Resolved | After 7 days, lenders can trigger a **Clawback** via `withdraw_funds` (full principal refund) even if the loan isn't canceled. This applies to both `Open` and `Funded` (but not yet disbursed) states. |
| **3. Over-funding Prevention** | ✅ Resolved | Contract calculates `remaining = target - current`. Any contribution exceeding this is strictly rejected on-chain with `OverFunding`. |
| **4. Post-Start Lock** | ✅ Resolved | `disburse_loan` transitions status to `Active`. Contributions are strictly forbidden once the loan has started. |
| **5. Over-repayment Prevention**| ✅ Resolved | `make_repayment` rejects any amount exceeding the remaining balance to prevent SOL being locked in the vault. |
| **6. Completion Flow** | ✅ Resolved | Loan status automatically transitions to `Completed` once `total_repaid == total_repayable`. |
| **7. Participant-only Default** | ✅ Resolved | Only the borrower or a lender can trigger `mark_default` if a payment is 30+ days overdue. This prevents public griefing. |
| **8. Pro-rata Withdrawals** | ✅ Resolved | Lenders claim their share of repayments based on `(Position / Target) * Total Repaid`. Shared logic handles both partial and full returns. |

## Verification Status

All scenarios listed above are covered by the Rust behavioral test suite located at `programs/dblt-lending/tests/behavioral.rs`.

### Key Safety Mechanisms
*   **Time-based Guardrails**: Enforces a 7-day standard funding period and 30-day default grace period.
*   **Non-Custodial SOL Handling**: Vault SOL is transferred using manual lamport adjustments to support PDAs with data, ensuring absolute control over protocol liquidity.
*   **State Machine Integrity**: Strict status transitions (`Open` -> `Funded` -> `Active` -> `Completed`) prevent obsolete instructions from being executed.
