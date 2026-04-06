.PHONY: help install build dev test lint build-java docker-build deploy-infra

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

install: ## Install JS dependencies
	npm install

build: ## Build all JS/TS packages
	npm run build

dev: ## Start all dev servers
	npm run dev

test: ## Run all tests
	npm run test

lint: ## Lint all packages
	npm run lint

build-java: ## Build Java app (not configured yet)
	@echo "Java build not configured yet"

docker-build: ## Build lending-api Docker image (local)
	docker build -t defi-hack/lending-api:local -f apps/lending-api/Dockerfile apps/lending-api
