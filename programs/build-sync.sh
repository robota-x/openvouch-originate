#!/usr/bin/env bash
# programs/build-sync.sh
#
# Orchestrates Anchor workspace build and IDL distribution to the @openvouch/idl package.
# Generates a simple JSON registry of program IDs.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYS_DIR="$REPO_ROOT/keys"
IDL_SRC_DIR="$REPO_ROOT/packages/idl/src"
IDL_JSON_DIR="$IDL_SRC_DIR/json"

ENV="localnet"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    *) echo "ERROR: unknown argument '$1'"; exit 1 ;;
  esac
done

cd "$REPO_ROOT"

# 1. Ensure Authority Key
AUTH_KEY="$KEYS_DIR/$ENV/authority.json"
[[ -f "$AUTH_KEY" ]] || {
  [[ "$ENV" == "localnet" ]] && solana-keygen new --no-bip39-passphrase --silent --outfile "$AUTH_KEY" || { echo "ERROR: Authority key missing"; exit 1; }
}

# 2. Discover & Sync Program Keys
mkdir -p target/deploy "$IDL_JSON_DIR"
REGISTRY_FILE="$IDL_SRC_DIR/registry.json"
jq -n '{}' > "$REGISTRY_FILE"

for dir in programs/*/; do
  [[ -f "$dir/Cargo.toml" ]] || continue
  name=$(basename "$dir")
  prog="${name//-/_}"

  key_file="$KEYS_DIR/$ENV/${prog}.json"
  if [[ ! -f "$key_file" ]]; then
    [[ "$ENV" == "localnet" ]] && solana-keygen new --no-bip39-passphrase --silent --outfile "$key_file" || { echo "ERROR: Key missing for $prog"; exit 1; }
  fi

  pubkey=$(solana-keygen pubkey "$key_file")
  tmp_registry="$(mktemp)"
  jq --arg k "${prog}_program_id" --arg v "$pubkey" '. + {($k): $v}' "$REGISTRY_FILE" > "$tmp_registry"
  mv "$tmp_registry" "$REGISTRY_FILE"
  cp "$key_file" "target/deploy/${prog}-keypair.json"
done

echo "==> Syncing keys & Building"
anchor keys sync
anchor build

echo "==> Distributing IDLs"
for idl in target/idl/*.json; do
  [[ -f "$idl" ]] && cp "$idl" "$IDL_JSON_DIR/"
done

# Cleanup
find programs -type d -name "target" -exec rm -rf {} + 2>/dev/null || true
echo "==> Build complete ($ENV). Program IDs in $REGISTRY_FILE"
