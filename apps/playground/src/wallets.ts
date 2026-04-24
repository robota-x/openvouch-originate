import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import * as fs from "node:fs";
import * as path from "node:path";

export class WalletManager {
  private mnemonic: string;

  constructor(mnemonicPath: string) {
    if (!fs.existsSync(mnemonicPath)) {
      console.log("==> Generating new playground mnemonic");
      const mnemonic = bip39.generateMnemonic();
      fs.mkdirSync(path.dirname(mnemonicPath), { recursive: true });
      fs.writeFileSync(mnemonicPath, mnemonic);
      this.mnemonic = mnemonic;
    } else {
      this.mnemonic = fs.readFileSync(mnemonicPath, "utf-8").trim();
    }
  }

  getWallet(index: number): Keypair {
    const seed = bip39.mnemonicToSeedSync(this.mnemonic);
    const derivedPath = `m/44'/501'/0'/${index}'`;
    const { key } = derivePath(derivedPath, seed.toString("hex"));
    return Keypair.fromSeed(key);
  }

  getIdentities() {
    return {
      owner: this.getWallet(0),
      borrowers: [this.getWallet(1), this.getWallet(2)],
      lenders: [
        this.getWallet(3),
        this.getWallet(4),
        this.getWallet(5),
        this.getWallet(6),
        this.getWallet(7),
      ],
      attestors: [this.getWallet(8), this.getWallet(9)],
    };
  }
}
