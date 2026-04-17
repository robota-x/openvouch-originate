# `dblt_lending` (Anchor)

Hackathon scaffold for a DBLT-backed lending flow: global **config**, per-wallet **profiles** (borrower vs lender), **identity/financial scores**, **loan listings**, and a **fund** transition. Logic matches the original monolithic sketch; it is **not** production-ready.

## Crate layout

| Path | Role |
|------|------|
| [`src/lib.rs`](src/lib.rs) | `declare_id!`, `#[program]` entry (forwards to handlers), and **`#[derive(Accounts)]` instruction contexts** (`Initialize`, `RegisterUser`, `UpdateScore`, `CreateLoan`, `FundLoan`). Account structs must live here (at crate root): a separate `contexts`/`accounts` **submodule** triggered `#[program]` macro resolution failures with Anchor 1.0 on this toolchain. |
| [`src/constants.rs`](src/constants.rs) | PDA seed prefixes (`SEED_PROFILE`, `SEED_LOAN`). |
| [`src/state.rs`](src/state.rs) | `#[account]` data: `Config`, `UserProfile`, `LoanListing`, `LoanStatus`. |
| [`src/error.rs`](src/error.rs) | Single `#[error_code]` enum (Anchor 1.x). |
| [`src/handlers.rs`](src/handlers.rs) | Instruction bodies (initialize, register, scores, listing, fund). |

## Instructions (intended behavior)

| Instruction | Purpose |
|-------------|---------|
| `initialize` | Create `Config` with admin, DBLT mint pubkey, fee bps, zero counters. |
| `register_borrower` | Init borrower `UserProfile` (company name, scores, caps). |
| `register_lender` | Init lender profile (`borrower` field in accounts = shared `RegisterUser` layout). |
| `update_identity_score` | Bump identity score by component id (1–4). |
| `update_financial_score` | Bump financial score for non-lenders only. |
| `create_loan_listing` | Create a `LoanListing` PDA (borrower, amount, rate, pending status). |
| `fund_loan` | Mark listing funded if still pending; fee math logged only. |

## Build (repo root)

Uses **Make** as the local entrypoint (see repo root `Makefile`):

- `make anchor-build` — `anchor build`
- `make test-programs` — `cargo test -p dblt_lending`

Dependencies: **anchor-lang 1.0.0**, **anchor-spl 1.0.0** (see [`Cargo.toml`](Cargo.toml)). Align CLI with [`.anchor-version`](../../.anchor-version) / [`Anchor.toml`](../../Anchor.toml) `[toolchain]`.

## Known issues and technical debt (not fixed here)

- **PDA consistency:** `fund_loan` listing/borrower seeds may not match how `create_loan_listing` derived the listing PDA (wallet vs profile keys). Review before relying on funding.
- **Account size:** `UserProfile` uses `Option<String>`; `space` uses `size_of` only — **undersized** for real strings; needs max length or fixed buffers.
- **Trust model:** Score updates are **not** gated by a verifier or signature; any caller can bump scores up to caps (demo only).
- **No asset movement:** No SPL or SOL CPI; `fee_amount` / `platform_fee` are computed and ignored.
- **Counters:** `config.total_borrowers` / `total_lenders` are never incremented after `initialize`.
- **Lender registration:** Original sketch omitted `financial_max_score` / `financial_score` on lender path; behavior relies on default/zero-init.
- **Macro warnings:** `unexpected_cfgs` from generated program entrypoint (upstream / toolchain); harmless for now.

Historical monolith: use `git` history if you need the pre-split `lib.rs` reference (`lib.rs.old` removed to avoid drift).
