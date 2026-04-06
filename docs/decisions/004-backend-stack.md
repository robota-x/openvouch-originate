# ADR 004 — Backend stack

**Status:** Accepted
**Date:** 2026-04-06

## Context

`apps/lending-api` is a Node.js HTTP API. It needs a framework, a dev runtime, a production build strategy, a test approach, and a container story.

## Decisions

### Fastify 5 (not Express)

Fastify over Express for three reasons:
1. **Typed by default** — route handlers and schemas are typed end-to-end without third-party adapters
2. **Faster** — lower overhead per request (relevant for a DeFi API where latency matters)
3. **`inject()` for tests** — Fastify's built-in `inject()` method allows full HTTP-level testing without binding a port or starting a server. This is cleaner than Express's `supertest` pattern.

### App factory pattern

`src/app.ts` exports `buildApp()` — a pure factory that constructs and returns a `FastifyInstance`. It never calls `.listen()`.

`src/index.ts` is the entry point only: it calls `buildApp()` then `.listen()`. Nothing else lives there.

**Why:** Separating construction from binding allows tests to call `buildApp()` and use `app.inject()` without touching the network. `index.ts` becomes a thin shell that is never imported by tests. This is the pattern recommended by Fastify's own documentation.

### tsx for development

`tsx` (esbuild-based TypeScript runner) powers `npm run dev`. It starts in milliseconds with no separate compile step. Used only for local development — it is not a production dependency.

### tsc for production build

`npm run build` runs `tsc`, emitting clean JavaScript to `dist/`. The production container runs `node dist/index.js`. No runtime TypeScript dependency, no esbuild in prod. TypeScript is a dev-time concern.

### Vitest in a standalone `vitest.config.ts`

`apps/lending-api` has no Vite pipeline, so the Vitest config is a standalone `vitest.config.ts` using `vitest/config` (not `vite`). Environment is `node` — no DOM simulation needed.

Test files under `src/` will be compiled into `dist/` by tsc. This is harmless — the emitted JS is never executed. Excluding test files from the tsc output is deferred (YAGNI until it causes a problem).

### Self-contained Dockerfile

The `Dockerfile` builds and runs the API from `apps/lending-api/` as the Docker context. It does not require the repo root because `shared-types` is not yet a dependency.

**Caveat:** If `shared-types` is added as a dependency of `lending-api`, the Docker build strategy must be revisited — the context will need to include the workspace root or the package will need to be pre-built and copied in.

## Consequences

- `src/index.ts` must never contain application logic — only the `buildApp()` call and `.listen()`.
- All local imports in `src/` must use `.js` extensions (NodeNext module resolution requires this; TypeScript resolves them to `.ts` at compile time, Node runs the emitted `.js`).
- If shared-types becomes a dependency, update this ADR and revise the Dockerfile strategy.
