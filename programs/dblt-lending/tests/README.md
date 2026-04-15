How to Run These Tests
Ensure dependencies are updated: Make sure your Cargo.toml includes the necessary dependencies for the new structs if they aren't already there (usually handled by anchor-lang).

cd programs/dblt-lending
cargo test smoke

Or run all tests:

cargo test
