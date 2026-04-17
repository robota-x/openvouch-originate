#!/usr/bin/env bash
# programs/build-sync.sh
#
# Build all Anchor programs for a target environment, sync program IDs, and
# copy the generated IDLs into the backend and frontend packages.
#
# April 2026 Discovery:
#   Avoid 'anchor build -p <name>'. In Anchor 1.0, targeted builds can trigger 
#   nested 'target/' directories inside program folders, leading to Program ID
#   mismatches and ghost keypair generation. Always use workspace-level 
#   'anchor build' to ensure consistency across the monorepo.
#
# Usage:
#   bash programs/build-sync.sh              # localnet (default)
#   bash programs/build-sync.sh --env devnet
#
# Keypair policy:
#   localnet   auto-generated into keys/localnet/ on first run; reused after that
#   devnet     must exist at keys/devnet/<name>.json; never auto-generated
#
# Requires: Anchor CLI 1.0.x, solana-keygen in PATH

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROGRAMS_DIR="$REPO_ROOT/programs"
KEYS_DIR="$REPO_ROOT/keys"
IDL_DEST_BACKEND="$REPO_ROOT/apps/lending-website-backend/src/idl"
IDL_DEST_FRONTEND="$REPO_ROOT/apps/lending-website-frontend/src/idl"

# ── Arguments ─────────────────────────────────────────────────────────────────

ENV="localnet"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    *) echo "ERROR: unknown argument '$1'. Usage: build-sync.sh [--env localnet|devnet]"; exit 1 ;;
  esac
done

cd "$REPO_ROOT"

# ── 1. Discover programs ──────────────────────────────────────────────────────

programs=()
# Look for directories containing a Cargo.toml that are NOT target folders
for dir in "$PROGRAMS_DIR"/*/; do
  [[ -f "$dir/Cargo.toml" ]] || continue
  name="$(basename "$dir")"
  # Standardize on underscore for Anchor CLI consistency
  programs+=("${name//-/_}")
done

if [[ ${#programs[@]} -eq 0 ]]; then
  echo "No programs found under $PROGRAMS_DIR — nothing to do."
  exit 0
fi

echo "env      : $ENV"
echo "programs : ${programs[*]}"

# ── 2. Keypairs ───────────────────────────────────────────────────────────────
# keys/<env>/ is the source of truth. target/deploy/ is ephemeral build output.

env_keys="$KEYS_DIR/$ENV"
mkdir -p "$env_keys" "$REPO_ROOT/target/deploy"

for prog in "${programs[@]}"; do
  src="$env_keys/${prog}.json"

  if [[ ! -f "$src" ]]; then
    if [[ "$ENV" == "localnet" ]]; then
      echo ""
      echo "==> generating localnet keypair for $prog"
      solana-keygen new --no-bip39-passphrase --silent --outfile "$src"
    else
      echo ""
      echo "ERROR: keypair not found for '$prog' ($ENV)"
      echo "  expected : $src"
      exit 1
    fi
  fi

  # Copy to the root target/deploy using the name Anchor expects
  cp "$src" "$REPO_ROOT/target/deploy/${prog}-keypair.json"
done

# ── 3. Sync ───────────────────────────────────────────────────────────────────
# Update declare_id! in source and Anchor.toml based on the keys in target/deploy
echo ""
echo "==> anchor keys sync"
anchor keys sync

# ── 4. Build ──────────────────────────────────────────────────────────────────
# CRITICAL: We use workspace build (no -p flag) to avoid nested target folder 
# discrepancy found in April 2026.
echo ""
echo "==> anchor build (workspace)"
anchor build

# ── 5. Copy IDLs ──────────────────────────────────────────────────────────────

echo ""
echo "==> copying IDLs"
mkdir -p "$IDL_DEST_BACKEND" "$IDL_DEST_FRONTEND"

for prog in "${programs[@]}"; do
  idl_src="$REPO_ROOT/target/idl/${prog}.json"
  if [[ -f "$idl_src" ]]; then
    cp "$idl_src" "$IDL_DEST_BACKEND/${prog}.json"
    cp "$idl_src" "$IDL_DEST_FRONTEND/${prog}.json"
    echo "    ${prog}.json -> backend & frontend"
  else
    echo "    WARNING: target/idl/${prog}.json not found — skipped"
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "program IDs ($ENV):"
for prog in "${programs[@]}"; do
  id="$(solana-keygen pubkey "$env_keys/${prog}.json")"
  echo "    $(echo "$prog" | tr '[:lower:]' '[:upper:]')_PROGRAM_ID=$id"
done

echo ""
echo "Cleanup: checking for nested target folders..."
find "$PROGRAMS_DIR" -type d -name "target" -exec rm -rf {} + 2>/dev/null || true
echo "Done."
