.PHONY: help install build dev test lint build-java

.DEFAULT_GOAL := help

.PHONY: help install install-js install-all \
	build build-js build-programs \
	dev test test-js test-programs \
	lint anchor-build anchor-test anchor-keys-sync clean-anchor docker-build

help: ## List targets (start here: Make drives npm and Anchor/cargo)
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  %-22s %s\n", $$1, $$2}'

install: install-js ## Install Node dependencies (npm workspaces)

install-js:
	npm install

install-all: install-js ## JS deps + reminder for Solana/Anchor CLI
	@echo "Use Anchor 1.0.0 and Solana 3.1.x (see Anchor.toml [toolchain], .anchor-version). Example: avm install 1.0.0 && avm use 1.0.0"

build: build-js build-programs ## Turbo/JS build, then Anchor programs

build-js: ## TS/Vite/API packages only
	npm run build

build-programs: anchor-build ## On-chain artifacts (IDL, .so)

anchor-build: ## anchor build (from repo root; requires Anchor CLI 1.0.x)
	anchor build

dev: ## Start dev servers (Turbo)
	npm run dev

test: test-js test-programs ## All tests: JS workspaces then Rust program crate

test-js: ## Frontend/API tests (Turbo)
	npm run test

test-programs: ## Rust integration tests for dblt_lending
	cargo test -p dblt_lending

anchor-test: anchor-build test-programs ## Used by Anchor.toml [scripts].test

lint: ## Lint JS/TS workspaces
	npm run lint

anchor-keys-sync: ## Align declare_id! and Anchor.toml with target/deploy keypair
	anchor keys sync

clean-anchor: ## Remove Anchor build outputs (local only)
	rm -rf target/deploy target/idl target/verifiable .anchor