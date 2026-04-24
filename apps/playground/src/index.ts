import { Command } from "commander";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletManager } from "./wallets.js";
import { Registry } from "@openvouch/idl";
import * as path from "node:path";

const program = new Command();
const walletManager = new WalletManager(path.resolve("../../keys/playground-mnemonic.txt"));

program
  .name("openvouch-playground")
  .description("CLI playground for OpenVouch Originate")
  .version("0.1.0");

program
  .command("list-programs")
  .description("List all programs and their IDs from the registry")
  .action(() => {
    const ids = Registry.getIds();
    console.log("\nRegistered Programs:");
    console.log("------------------------------------------------------------------");
    Object.entries(ids).forEach(([name, id]) => {
      if (name.endsWith("_program_id")) {
        console.log(`| ${name.replace("_program_id", "").padEnd(12)} | ${id.padEnd(44)} |`);
      }
    });
    console.log("------------------------------------------------------------------\n");
  });

program
  .command("setup-env")
  .description("Airdrop SOL to all test identities")
  .option("-u, --url <url>", "Solana RPC URL", "http://localhost:8899")
  .action(async (options) => {
    const connection = new Connection(options.url, "confirmed");
    const idents = walletManager.getIdentities();
    const all = [
      { name: "Owner", wallet: idents.owner },
      ...idents.borrowers.map((w, i) => ({ name: `Borrower ${i + 1}`, wallet: w })),
      ...idents.lenders.map((w, i) => ({ name: `Lender ${i + 1}`, wallet: w })),
      ...idents.attestors.map((w, i) => ({ name: `Attestor ${i + 1}`, wallet: w })),
    ];

    console.log(`\nTesting Environment: ${options.url}`);
    console.log("------------------------------------------------------------------");
    console.log("| Role         | Address                                      | Balance |");
    console.log("------------------------------------------------------------------");

    for (const item of all) {
      let balance = 0;
      try {
        balance = await connection.getBalance(item.wallet.publicKey);
        if (balance < 1 * LAMPORTS_PER_SOL && options.url.includes("localhost")) {
          const sig = await connection.requestAirdrop(item.wallet.publicKey, 2 * LAMPORTS_PER_SOL);
          await connection.confirmTransaction(sig);
          balance = await connection.getBalance(item.wallet.publicKey);
        }
      } catch (e) {
        // Ignore errors for display
      }
      const sol = (balance / LAMPORTS_PER_SOL).toFixed(2);
      console.log(`| ${item.name.padEnd(12)} | ${item.wallet.publicKey.toBase58().padEnd(44)} | ${sol.padStart(7)} |`);
    }
    console.log("------------------------------------------------------------------\n");
  });

program
  .command("bootstrap-protocol")
  .description("TODO: Initialize global state for lending and generic records")
  .action(() => console.log("STUB: bootstrap-protocol - To be implemented."));

program
  .command("mock-attestations")
  .description("TODO: Create dummy attestations for borrowers")
  .action(() => console.log("STUB: mock-attestations - To be implemented."));

program
  .command("simulate-lending")
  .description("TODO: Run lending simulation (deposits, loans)")
  .action(() => console.log("STUB: simulate-lending - To be implemented."));

program.parse();
