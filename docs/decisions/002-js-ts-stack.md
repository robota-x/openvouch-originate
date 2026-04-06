# ADR 002 — JavaScript / TypeScript stack

**Status:** Accepted
**Date:** 2026-04-06

## Context

The project needs a consistent JS/TS toolchain across two apps (`lending-api`, `web`) and a shared package (`shared-types`). Choices here affect build speed, DX, and how well the monorepo hangs together.

## Decisions

### Node 22 LTS

Node 22 is the current LTS line. It ships with a native test runner and `--watch` mode, but we use Vitest for its superior DX and ecosystem. Engines field in each `package.json` gates to `>=22`.

### TypeScript 5 strict + skipLibCheck

`strict: true` catches the most bugs at compile time. `skipLibCheck: true` is enabled globally — it avoids type errors from third-party `.d.ts` files that are not under our control (common with Vitest and Fastify type declarations conflicting with `@types/node`). We trust our own code to be correct; we do not need to validate upstream type declarations.

### npm workspaces

npm workspaces (not Yarn, not pnpm) keeps the dependency graph simple. All packages share a single `node_modules` at the root. No additional package manager tooling required.

### Turborepo

Turborepo orchestrates the build/test/lint pipeline across packages. Key properties:
- **Topology-aware**: tasks run in dependency order (e.g. `shared-types` builds before `lending-api`)
- **Caching**: outputs are cached by input hash; clean CI runs after unrelated changes are fast
- **Parallelism**: independent tasks run concurrently on multi-core machines

The `turbo.json` pipeline defines `build`, `test`, and `lint` tasks. All packages must expose these scripts in their `package.json` (even if they are no-ops) or Turbo will error.

### Vitest as the single test runner

Vitest is used across all TypeScript packages. It is faster than Jest (esbuild transform), has first-class ESM support, and uses the same config format as Vite where applicable. Each package owns its own Vitest config; `apps/lending-api` uses a standalone `vitest.config.ts` (no Vite pipeline), `apps/web` embeds the `test` block in `vite.config.ts` so tests inherit the Vue plugin.

## Consequences

- All packages need `build`, `test`, and `lint` scripts — even stubs.
- NodeNext module resolution in `apps/lending-api` requires `.js` extensions on all local imports (TypeScript emits `.js`; Node runs `.js`).
- `skipLibCheck` is a global escape hatch — it does not excuse us from writing correct types in our own code.
