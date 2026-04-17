# Solana economics, storage, and program model — reference

Practical reference for anyone on this project making decisions about program design,
PDA usage, fee expectations, and deployment costs. Covers the questions that trip up
web2 engineers the first time they hit Solana.

---

## The account model (everything is an account)

Solana's world state is a flat key-value store:

```
address (32-byte pubkey, base58)  →  { lamports, data: bytes, owner, executable }
```

There are no special "contract storage" slots or "user balance" tables. Everything —
wallets, programs, token balances, loan records, PDAs — is an account in this store.

| Account type | executable | data | owner |
|---|---|---|---|
| Wallet | false | empty | System Program |
| Program | true | pointer to ProgramData | BpfLoaderUpgradeable |
| ProgramData | false | bytecode | BpfLoaderUpgradeable |
| PDA (data) | false | your struct, Borsh-encoded | your program |
| Token account | false | token balance + metadata | SPL Token Program |

A "deployed program" is just an account with `executable = true` and bytecode in its
data field. There is no separate hosting layer.

---

## Where the code lives — validators and history

Solana separates two things:

**Current state (the "bank")** — the live snapshot of every account right now.
Every consensus validator holds a full copy. This is what gets checked when
a transaction comes in. Size: ~100–200 GB as of 2025.

**Transaction history (the ledger)** — the append-only log of every transaction.
Most validators do NOT keep the full history. They sync from snapshots (compressed
dumps of the full account state) rather than replaying from genesis. The full
history is petabytes and is only maintained by archive nodes
(Solana Foundation, Helius, Triton, etc.).

**Practical implication:** your program bytecode is in the current state and is
available on every validator instantly. Historical queries (transaction lookups,
event history) require an RPC provider with archive access — which is why ADR 005
specifies Helius.

---

## Rent: the anti-spam / storage pricing mechanism

Every account must maintain a minimum SOL balance proportional to its size in bytes.
This is the **rent-exempt reserve** — a deposit, not a fee.

```
rent-exempt reserve ≈ 6,960 lamports × size_in_bytes
                    ≈ 0.00000696 SOL per byte
```

### Why it exists

Storing account data costs validator hardware (RAM, SSD). Rent makes that cost real
and prevents free-riders from bloating the global state indefinitely.

### Key property: it is a deposit, not a fee

If you close an account, the lamports are returned to the payer. You are not paying
for hosting — you are locking up collateral proportional to the space you use.
Once locked, there is no ongoing charge.

### What happens if balance drops below the threshold

The account becomes eligible for garbage collection. Any transaction can close it,
sweeping the remaining lamports to the transaction submitter. For a program account
this means the program ceases to exist. In practice this does not happen accidentally
because:

1. Wallets cannot arbitrarily spend from accounts they don't own
2. Programs you deploy are funded to rent-exempt at deployment time
3. The balance never decreases due to usage

The risk is real only if you deliberately defund an account, or if a program has a
logic bug that drains its own accounts.

---

## Program deployment costs

Two components:

**Rent-exempt reserve (one-time, recoverable)**

| Program size | Reserve needed | At $150/SOL |
|---|---|---|
| 300 KB | ~2.1 SOL | ~$315 |
| 600 KB | ~4.2 SOL | ~$630 |
| 900 KB (near limit) | ~6.3 SOL | ~$945 |

**Transaction fees (non-recoverable, negligible)**

Bytecode is uploaded in ~1 KB chunks. Each chunk is a transaction at ~0.000005 SOL.
A 600 KB program = ~600 transactions = ~0.003 SOL in fees (~$0.45). Rounding error.

**Upgrade costs**

Uploading new bytecode costs the same transaction fees. If the new binary is larger,
you pay the additional rent-exempt reserve. If smaller, you get a refund.

---

## Transaction fees — who pays

Transaction fees are always paid by the **first signer** (the transaction initiator),
never from the program's own funds.

| Action | Fee payer |
|---|---|
| Borrower creates loan listing | Borrower |
| Lender funds loan | Lender |
| Borrower repays | Borrower |
| Any wallet auth action | The wallet owner |

**Base fee:** ~0.000005 SOL per transaction (~$0.001). Effectively invisible to users.

**Priority fees:** optional tip to validators for faster inclusion during congestion.
User-controlled, variable, can spike to $0.01–$0.10 during high load.

**The program never pays execution fees.** It holds a rent-exempt reserve that sits
untouched. It is a parking deposit, not a fuel tank.

---

## PDAs — Program Derived Addresses

### What they are

A PDA is an account whose address is derived deterministically from seeds and the
program ID, chosen specifically to fall **off** the Ed25519 elliptic curve:

```
PDA = sha256(seeds..., program_id, "ProgramDerivedAddress")
      ↑ retried with an incrementing "bump" byte until result is off-curve
```

Because the address is off-curve, no private key exists for it. No external party
can sign for it. Only the owning program can authorise writes via `invoke_signed`.

### Why they matter for your design

PDAs are how programs store per-entity state on-chain. In this project:

```
attestation PDA  =  hash(borrower_pubkey, b"attestation", program_id)
loan PDA         =  hash(borrower_pubkey, b"loan", program_id)
```

Any client can independently compute where a borrower's data lives — no secondary
lookup needed.

### The funding gotcha

**When a PDA is created (`init` in Anchor), someone must fund its rent-exempt
reserve.** This is the `payer` field in the Accounts struct. The payer's lamport
balance is reduced by the reserve amount.

For PDAs that hold user funds (escrow), this is self-funding — the user transfers
funds in and the account is naturally funded. For PDAs that hold only metadata
(a loan record, an attestation), the payer must explicitly cover the reserve.

**In practice:**
- Loan listing PDA created by borrower → borrower pays reserve (~0.002–0.005 SOL)
- Attestation PDA created by KYC provider → provider pays reserve
- Generic record PDA → `signer1` pays (as in our `CreateRecord` context)

The reserve is returned when the account is closed. If your UX involves creating
many small metadata PDAs per user, the cumulative reserve cost can become a friction
point worth surfacing in the UI.

### PDAs are cryptographically tied to the program ID

PDA addresses embed the program ID in the derivation. If you ever deploy a new
program at a different address (new keypair), the new program has no authority over
PDAs derived by the old one. Existing on-chain data is stranded unless you write a
migration program. This is the main reason program upgrades (same ID, new bytecode)
are strongly preferred over redeployments.

---

## Program IDs — keypairs, not code hashes

**The program ID is the public key of an Ed25519 keypair** generated at first build
(`target/deploy/<name>-keypair.json`). It has no cryptographic relationship to the
bytecode. You can:

- Deploy completely different bytecode to the same address (`anchor upgrade`)
- Take your compiled binary and deploy it at a different address

`declare_id!(...)` in `lib.rs` embeds the expected address into the binary as a
runtime check — it prevents your compiled code from running if deployed at the
wrong address (guards against substitution attacks). `Anchor.toml` stores the same
ID for the CLI to use at deploy time. `anchor keys sync` keeps them consistent.

**Upgrade authority:** by default your deployer wallet is the upgrade authority and
can push new bytecode at any time. Users trusting your program ID are trusting your
upgrade key too. Freezing a program (setting upgrade authority to null) makes it
immutable — a meaningful trust commitment for a DeFi protocol.

---

## Program binary size — why it is large

A short Rust program (100–2,000 LOC) compiled for the Solana BPF target with Anchor
produces a binary of roughly **500 KB–1.5 MB**. This surprises web2 engineers
expecting 10–20 KB. The reasons:

**1. Static linking — no shared libraries**
The BPF target has no dynamic linker. Every dependency (standard library, Anchor
framework, Borsh, SPL token, etc.) is compiled and linked into your binary. There
is no equivalent of a shared `.so` or a CDN-hosted npm package.

**2. Anchor framework baseline**
Anchor generates account validation, deserialization, discriminator matching, and
error handling code for every instruction and account type. The Anchor benchmark
for its own minimal program is **~933 KB** just from the framework in v1.0.0 — before
any application logic. A program with 50 lines of business logic still carries this
full baseline.

**3. Rust monomorphization**
Rust compiles generic types (`Vec<T>`, `Option<T>`, `Result<T,E>`) separately for
each concrete type. A program using `Vec<u64>` and `Vec<Pubkey>` gets two compiled
copies of the Vec machinery. With many generic dependencies this accumulates.

**4. Borsh serialization code generation**
Every `#[account]` struct generates Borsh encode/decode implementations at compile
time. For complex types this is non-trivial code.

**5. LTO helps, but only so much**
With `lto = "fat"` and `codegen-units = 1` (which this repo's workspace `Cargo.toml`
sets), the linker can eliminate dead code across crate boundaries. This brings a
naive ~4 MB binary down to ~900 KB–1.5 MB. Without LTO the situation is worse.

**Actual size expectations for this project:**

| Program | Estimated compiled size |
|---|---|
| `generic-record` (tiny, no SPL deps) | ~600–800 KB |
| `dblt-lending` (uses `anchor-spl`) | ~900 KB–1.3 MB |

The hard deploy limit is **900 KB** for non-upgradeable programs; upgradeable programs
(the default) have a higher ceiling (~10 MB in current Solana). In practice,
staying under 1.5 MB with LTO is achievable for most programs in this repo.

**If size becomes a problem:**
- Ensure LTO is enabled (already is in root `Cargo.toml`)
- `anchor-spl` is a large dependency; remove it if not needed (`generic-record` should not depend on it)
- `cargo-build-sbf --strip-all` removes symbol tables (saves 3–8%)
- Move large lookup tables to separate data accounts instead of embedding them in code

---

## Quick-reference: cost table

Figures at $150 SOL. Adjust linearly.

| Item | SOL | USD |
|---|---|---|
| Transaction base fee | 0.000005 | $0.001 |
| Rent-exempt: small PDA (100 bytes) | 0.001 | $0.15 |
| Rent-exempt: typical PDA (1 KB) | 0.007 | $1.05 |
| Rent-exempt: 600 KB program | ~4.2 | ~$630 |
| Rent-exempt: 1 MB program | ~7.0 | ~$1,050 |
| Spam 1,000 max-size programs | ~7,000 | ~$1,050,000 |

---

*Sources: Anchor binary size benchmarks (anchor/bench/BINARY_SIZE.md), Solana program
limitations docs, RareSkills Solana storage cost analysis, Helius program optimisation
guide. Re-check rent rate (`solana rent 1`) and SOL price before using figures in
user-facing copy.*
