#!/bin/bash
set -e

echo "Building Anchor program..."
anchor build

echo "Syncing IDLs to packages/idl..."
cp target/idl/*.json packages/idl/src/json/

echo "Rebuilding @openvouch/idl package..."
npm run build -w packages/idl

echo "✅ IDL synchronization complete."
