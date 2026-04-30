#!/usr/bin/env bash
# scripts/localnet.sh
#
# Starts a local Solana test validator, deploys all programs, and funds the
# demo wallet. Run via: make localnet
#
# Subsequent runs kill and reset the validator — state is NOT preserved.
# Only rebuilds programs if source has changed (anchor build is incremental).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_WALLET="9KAQLuUTgJnjuhmPoUUrsS8gVG86pB8e3thW3ZTWSB1r"
AUTHORITY_KEY="$REPO_ROOT/keys/localnet/authority.json"
RPC="http://localhost:8899"

cd "$REPO_ROOT"

# ── 1. Reset validator ────────────────────────────────────────────────────────
echo "==> Stopping any existing validator..."
pkill -f solana-test-validator 2>/dev/null && sleep 1 || true

echo "==> Starting solana-test-validator (logs → /tmp/validator.log)..."
nohup solana-test-validator --reset --quiet > /tmp/validator.log 2>&1 &

echo -n "==> Waiting for validator"
until solana cluster-version --url "$RPC" > /dev/null 2>&1; do
  printf '.'
  sleep 1
done
echo " ready."

# ── 2. Fund wallets ───────────────────────────────────────────────────────────
AUTHORITY_PUBKEY=$(solana-keygen pubkey "$AUTHORITY_KEY")
echo "==> Funding authority ($AUTHORITY_PUBKEY)..."
solana airdrop 10 "$AUTHORITY_PUBKEY" --url "$RPC"

echo "==> Funding demo wallet ($DEMO_WALLET)..."
solana airdrop 100 "$DEMO_WALLET" --url "$RPC"

# ── 3. Build + sync keys ──────────────────────────────────────────────────────
echo "==> Building programs (localnet)..."
bash "$REPO_ROOT/programs/build-sync.sh" --env localnet

# ── 4. Deploy ─────────────────────────────────────────────────────────────────
echo "==> Deploying to localnet..."
anchor program deploy \
  --provider.cluster localnet \
  --provider.wallet "$AUTHORITY_KEY"

# ── 5. Rebuild IDL package ────────────────────────────────────────────────────
echo "==> Rebuilding @openvouch/idl..."
npm run build -w packages/idl

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "  Localnet:    $RPC  (validator log: /tmp/validator.log)"
echo "  Demo wallet: $DEMO_WALLET — 100 SOL"
echo ""
echo "  Run in separate terminals:"
echo "    make dev-chain    lending backend (real on-chain txns)"
echo "    cd apps/lending-website-frontend && npm run dev"
echo "    cd apps/attestation-identity-service && npm run dev"
echo "    cd apps/attestation-uk-company-service && npm run dev"
echo ""
echo "  make localnet-stop  to kill the validator"
