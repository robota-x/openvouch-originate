.PHONY: help \
	install install-js install-all \
	build build-js build-programs build-programs-devnet \
	dev \
	test test-js test-programs \
	lint \
	clean-anchor \
	docker-build build-java

.DEFAULT_GOAL := help

help: ## List targets
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  %-26s %s\n", $$1, $$2}'

# ── Dependencies ──────────────────────────────────────────────────────────────

install: ## Install Node dependencies (npm workspaces)
	npm install

install-all: install ## JS deps + reminder for Solana/Anchor CLI
	@echo "Requires Anchor 1.0.0 and Solana 3.1.x — see Anchor.toml [toolchain]."
	@echo "Install: avm install 1.0.0 && avm use 1.0.0"

# ── Build ─────────────────────────────────────────────────────────────────────

build: build-js build-programs ## Full build: JS packages + Anchor programs (localnet)

build-js: ## JS/TS packages only (Turbo)
	npm run build

build-programs: ## Build Anchor programs for localnet: sync keypairs, compile, copy IDLs
	bash programs/build-sync.sh --env localnet

build-programs-devnet: ## Build Anchor programs for devnet (keypairs must exist in keys/devnet/)
	bash programs/build-sync.sh --env devnet

# ── Dev & test ────────────────────────────────────────────────────────────────

dev: ## Start dev servers (Turbo)
	npm run dev

test: test-js test-programs ## All tests: JS workspaces + Rust program crates

test-js: ## Frontend/API tests (Turbo)
	npm run test

test-programs: ## Rust unit/integration tests for all program crates
	cargo test -p dblt_lending

lint: ## Lint JS/TS workspaces
	npm run lint

# ── Anchor utilities ──────────────────────────────────────────────────────────

clean-anchor: ## Delete Anchor build outputs (target/deploy, target/idl, .anchor)
	rm -rf target/deploy target/idl target/verifiable .anchor
