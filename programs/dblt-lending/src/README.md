Build & Deploy Commands

# Build smart contract

cd programs/dblt-lending
cargo build-sbf

# Generate IDL

cargo test-sbf -- --nocapture

# Deploy

anchor deploy

# Generate TypeScript types

anchor idl export --output-path clients/typescript/src/idl/dblt_lending.json
