# ADR 003 — Frontend stack

**Status:** Accepted
**Date:** 2026-04-06

## Context

The `apps/web` package is a wallet-integrated lending platform UI. It needs a component model, a CSS framework, a build tool, and a test strategy. All choices should follow the principles in ADR 001.

## Decisions

### Vue 3.5 + `<script setup>`

Vue 3 with the Composition API and `<script setup>` syntax. `<script setup>` is the idiomatic modern form — it compiles away at build time, results in smaller bundles, and eliminates the ceremony of `defineComponent`. No Options API.

### Vite 6

Vite is the build tool. It uses esbuild for dev (instant HMR) and Rollup for production (tree-shaking, chunking). It is the de-facto standard for Vue 3 projects and has first-class TypeScript support with no config required.

### Tailwind v4 — native Vite plugin, not PostCSS

Tailwind v4 ships a native `@tailwindcss/vite` plugin. We use that instead of the PostCSS approach.

**Why not PostCSS?** The PostCSS hybrid mode is a compatibility shim for toolchains that cannot use the native plugin. It is slower (runs as a PostCSS plugin rather than a Vite transform), requires a separate `postcss.config.*` file, and the v4 team recommends against it when Vite is available. Using the native plugin keeps config in one place (`vite.config.ts`) and removes a layer of indirection.

**Plugin order matters:** `tailwindcss()` must be listed before `vue()` in the plugins array. Tailwind needs to process CSS before Vue processes SFC `<style>` blocks.

**No `tailwind.config.js`:** Tailwind v4 infers content from the Vite plugin — no manual `content` glob required.

CSS entry point: `src/style.css` contains only `@import "tailwindcss"` — one line, no v3 directives.

### Vitest + @vue/test-utils + happy-dom

Tests live in `src/` alongside components. `happy-dom` is a lightweight DOM implementation — faster than jsdom for component tests that do not need a full browser environment.

The Vitest `test` block is embedded in `vite.config.ts` (not a separate `vitest.config.ts`) so that tests automatically inherit the `tailwindcss()` and `vue()` plugins needed to transform `.vue` files. A separate config file would require duplicating the plugin list.

### No Pinia (yet)

Global state management is YAGNI until we have a second component that needs shared state. When that point arrives, Pinia is the natural choice (Vuex is legacy). Until then, composables and component-local `ref`/`reactive` are sufficient.

### No Vue Router (yet)

YAGNI. A single-page app with one view does not need a router. Add Vue Router when a second route is required — not before.

## Consequences

- `vite.config.ts` is the single source of truth for both the build pipeline and the test environment.
- Adding PostCSS config files would be an error — Tailwind is handled entirely by the Vite plugin.
- When Pinia or Vue Router are added, update this ADR.
