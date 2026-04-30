# Precision & Financial Safety Standards

This document outlines the architecture for handling monetary values across the OpenVouch protocol to ensure zero precision loss and protection against floating-point errors.

## Core Principles

1.  **Integer-Only Internal Representation**: All SOL values MUST be handled as **Lamports** (integers) throughout the backend, contract, and internal frontend logic.
2.  **Solana Subdivision**: 1 SOL = 1,000,000,000 Lamports ($10^9$). Lamports are the absolute minimum unit; there are no fractional lamports.
3.  **Multiply Before Divide**: To minimize rounding errors in fee or interest calculations, always perform all multiplications in a sequence before any divisions.
4.  **Presentation-Layer Conversion**: Conversion to decimal SOL (e.g., `1.50`) is strictly reserved for the UI "view" layer.

## Technical Implementation

### 1. Smart Contract (Rust/Anchor)
-   **Data Types**: Use `u64` for all Lamport balances.
-   **Math**: Use checked math (`checked_mul`, `checked_div`) to prevent overflows.
-   **Interest Rates**: Use a **Basis Points (BPS)** system. 
    -   `100 BPS = 1.00%`
    -   `10,000 BPS = 100%`
-   **Rounding**: By default, Rust integer division truncates (rounds down). For the protocol, rounding "in favor of the vault" is preferred to ensure solvency.

### 2. Backend (Node.js/Hono)
-   **Input/Output**: API endpoints MUST accept and return balances as strings or `BigInt`. Avoid the JSON `number` type for large Lamport values, as it follows IEEE 754 (double precision) and loses precision above ~9,007,199,254,740,991.
-   **Database**: Store values in the SQLite/D1 database as `TEXT` or `INTEGER` (D1 integers are 64-bit, which safely fits a `u64`).

### 3. Frontend (Vue 3/TypeScript)
-   **BigInt Standard**: Use the native `BigInt` type for all arithmetic.
-   **Formatting**: Use a utility function for display:
    ```typescript
    const toSol = (lamports: bigint) => (Number(lamports) / 1e9).toFixed(9);
    ```
-   **Input Handling**: Convert user input strings to Lamports immediately using a safe multiplier:
    ```typescript
    const toLamports = (solString: string) => BigInt(Math.round(parseFloat(solString) * 1e9));
    ```

## Risk Mitigation Matrix

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Float Drift** | Loss of dust (fractions of SOL) | Ban `number` type for Lamport math. |
| **Integer Overflow** | Protocol insolvency | Use `checked_` math in Rust; use `BigInt` in TS. |
| **Rounding Error** | Unlocked funds in Vault | Always multiply before dividing. Round in favor of protocol. |
| **JSON Truncation** | Incorrect balance display | Pass balances as Strings in JSON payloads. |

## Audit Checklist
- [ ] Audit `CreateLoanModal.vue` interest calculations.
- [ ] Ensure `amount` in `loanRoutes.ts` uses `BigInt`.
- [ ] Verify `Transaction.from` logic doesn't involve intermediate float steps.
- [ ] Check `apps/lending-website-backend/src/db/schema.ts` for column types.
