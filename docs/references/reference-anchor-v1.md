# Anchor v1 — reference for this repo

This note is for day-to-day coding and workspace setup against **Anchor 1.x** (stable line starting at **1.0.0**, April 2026). Official sources stay authoritative; this file is the short map we actually use.

## Official docs (bookmark these)

### Local dev hierarchy (this repo)

**Make** is the apex: run **`make help`** from the repo root. Make targets call **`npm run …`** for Turbo/Node workspaces and **`anchor` / `cargo`** for programs. Root **`package.json`** stays Turbo-only (`build`, `dev`, `lint`, `test`) and does **not** delegate to Make or Rust.

- [Program structure](https://www.anchor-lang.com/docs/basics/program-structure) — mental model for on-chain code
- [Anchor CLI](https://www.anchor-lang.com/docs/references/cli) — build, test, deploy, IDL
- [Changelog](https://anchor-lang.com/docs/updates/changelog) — what changed release by release
- Releases: [solana-foundation/anchor](https://github.com/solana-foundation/anchor/releases)

## Core program model (unchanged in spirit)

Anchor programs are still built from the same four ideas:

1. **`declare_id!(...)`** — program’s on-chain address. Should match `target/deploy/<program>.json`; use `anchor keys sync` after clone or key regeneration.
2. **`#[program]`** — module whose **public** functions are instructions. First parameter is `Context<T>` where `T` implements `Accounts`.
3. **`#[derive(Accounts)]`** — declares required accounts and runs validation/constraints before the handler runs.
4. **`#[account]`** — layout of custom account data. Anchor stores an **8-byte discriminator** first; `space` is usually `8 + size_of_payload` (see program structure doc).

`Context` exposes `program_id`, `accounts`, `remaining_accounts`, and `bumps` (PDA bumps from constraint resolution).

## SemVer after 1.0

For **1.x**, the project uses standard semver more strictly than **0.x**:

- **Minor** versions may include **breaking** changes.
- **Patch** versions are for features/fixes without breaking the public API guarantees of that minor.

Treat upgrades like any serious dependency: read the changelog for that version.

## Toolchain alignment

- This repo pins **Anchor CLI 1.0.0** (see `.anchor-version`, `Anchor.toml` `[toolchain]`, and `programs/*/Cargo.toml` **anchor-lang 1.0.0**).
- Anchor **1.0.0** targets **Solana 3.x**; `Anchor.toml` sets **solana_version = "3.1.10"** to match upstream release testing. Align local `solana` / platform tools with that (`solana --version`, `anchor --version`).
- Program crate layout from **`anchor init`** defaults to the **multiple-file** program template.

## Defaults that differ from older Anchor (0.3x)

- **`anchor test` / `anchor localnet`**: **Surfpool** is the default local backend; use CLI flags if you need the legacy validator workflow.
- **`anchor init`**: default **test template** is **LiteSVM**-oriented (Rust tests loading `.so`), not “TS-only tests” by default.
- **`anchor init`**: **modular** program structure is the default (split instructions/state/errors across files).

When splicing Anchor into an existing monorepo (Vue, API, etc.), assume you are responsible for wiring **build → deploy → client** yourself; Anchor’s template is not the only valid layout, but **`programs/<name>/Cargo.toml` + `src/lib.rs`** (or equivalent `[lib]` path) must satisfy Anchor/Cargo.

## `Anchor.toml` and CLI behavior (1.0 highlights)

- **`[registry]`** was **removed** in 1.0. Drop it from old snippets; it is ignored or invalid depending on CLI version.
- **`[hooks]`** exists for `{pre,post}-{build,test,deploy}` — useful to chain npm/turbo steps with `anchor build` / `anchor test`.
- **Program ID check**: build can **fail if `declare_id!` does not match the deploy keypair** (`check_program_id_mismatch`); this check is **skipped during `anchor test`** to avoid friction.

## Language and safety rules that got stricter

- **Duplicate mutable accounts** in one instruction context are **disallowed by default**. If you truly need the same account twice, use the **`dup`** constraint (see [account constraints](https://www.anchor-lang.com/docs/references/account-constraints) on anchor-lang.com).
- **Only one `#[error_code]` enum per program** — split error types across multiple `#[error_code]` blocks will not fly.
- **`#[interface]` / `interface-instructions`** were **removed** — do not follow old tutorials that rely on them.
- **`declare_program!` (IDL-generated client in Rust)**:
  - Module **`utils` was renamed to `parsers`**.
  - **`errors` / `ProgramError` naming** changed — update call sites when upgrading generated code.
- **CPI**: program account info was **removed from the CPI context** — old CPI helpers may need rewriting.
- Using raw **`AccountInfo`** inside `#[derive(Accounts)]` is **deprecated** (compile-time warning); prefer typed account types where possible.

## IDL workflow (1.0)

- **Legacy IDL instructions** path was removed in favor of **Program Metadata** for IDL management (see changelog).
- **`anchor idl init` / `anchor idl upgrade`**: **program ID arguments were removed** from the CLI surface; workflow is tied to configured program / metadata.
- **`anchor idl`** commands gained **`--allow-localnet`** and fixes when run outside a workspace — relevant for scripts and CI.

## TypeScript / clients

- NPM package rename: **`@coral-xyz/anchor` → `@anchor-lang/core`**. New work and upgrades should use `@anchor-lang/core` with a version compatible with your Anchor CLI.
- IDL-related types are intended to be importable from the **package root** (not only deep `dist/...` paths).

## Newer language features worth knowing

- **`Migration<'info, From, To>`** — typed account **schema migration** when changing `#[account]` layouts.
- **`Program<'info>`** — generic program validation for **executable-only** checks in account structs.
- **`Owners`** exported from **`prelude`** where relevant for owner checks.

## Quick “are we good?” checklist for this workspace

- **Anchor CLI 1.0.0** + **Solana ~3.1.x**: `.anchor-version`, `Anchor.toml` `[toolchain]`, and **`anchor --version` / `solana --version`** agree.
- **`make help`** — **local dev entrypoint**: Make runs **`npm run …`** (Turbo workspaces) for Node and **`anchor` / `cargo`** for programs. Root **`package.json`** scripts are **Turbo-only** and do not invoke Make or Rust.
- `declare_id!`, `Anchor.toml` `[programs.<cluster>]`, and `target/deploy/*.json` **consistent** after **`make anchor-keys-sync`** (or first **`anchor build`**).
- Program **`Cargo.toml`**: **`anchor-lang = "1.0.0"`**, `idl-build` on **`anchor-lang`**; add **`anchor-spl/idl-build`** under the same feature when you depend on **`anchor-spl`**.
- Root **`Cargo.toml`** workspace **`members`** includes `programs/*`.
- Frontend/API deps use **`@anchor-lang/core`** at a version compatible with **1.0.0** IDLs (when you wire the client).

---

*Last aligned with Anchor changelog section **[1.0.0]** and [program structure](https://www.anchor-lang.com/docs/basics/program-structure); re-sync when bumping Anchor minor versions.*
