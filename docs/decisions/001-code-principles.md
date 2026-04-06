# ADR 001 — Code principles

**Status:** Accepted
**Date:** 2026-04-06

## Context

A consistent set of code principles reduces cognitive load, prevents gold-plating, and makes the codebase easier to extend or hand off. These principles apply to all TypeScript, Solidity, and configuration code in this repo.

## Decision

### YAGNI — You Aren't Gonna Need It

Do not add abstractions, configuration options, or features before they are needed by an actual current requirement. Every speculative addition is future maintenance debt.

### KISS — Keep It Simple

Prefer the simplest implementation that satisfies the requirement. Complexity should grow only in response to real requirements, not anticipated ones.

### DRY — Don't Repeat Knowledge

DRY is about knowledge, not syntax. Duplicating a two-line calculation in two places may be fine; duplicating a business rule is not. Extract shared knowledge to a single authoritative location; tolerate syntactic repetition where it keeps intent local and obvious.

### Single-responsibility functions

Each function does one thing. If a function's name requires "and" to describe it, split it.

### Pure functions preferred

Prefer functions that take inputs and return outputs with no side effects. Where side effects are unavoidable (I/O, logging, mutation), isolate them at the boundary and keep the interior logic pure.

**No mixed return + side effects.** A function should either return a value or perform a side effect — not both. Callers should not have to reason about hidden state changes when consuming a return value.

### No deep nesting

Maximum two levels of nesting. Use guard clauses and early returns to flatten conditionals:

```ts
// Avoid
function process(input: Input | null) {
  if (input) {
    if (input.valid) {
      // logic
    }
  }
}

// Prefer
function process(input: Input | null) {
  if (!input) return
  if (!input.valid) return
  // logic
}
```

### Comments explain WHY, not WHAT

Code should be readable enough that comments on *what* it does are redundant. Reserve comments for:
- Non-obvious constraints or invariants
- Why a decision was made that looks wrong at first glance
- References to external specifications or issues

### Good naming over comments

A well-named variable or function is better than a comment that compensates for a poor name. Rename before you comment.

## Consequences

- PRs that add speculative abstractions or violate these principles should be flagged in review.
- These principles are reflected in the ADRs for specific stack choices (see 002–004).
