import { 
  Connection, 
  Transaction, 
  PublicKey,
} from '@solana/web3.js'

/**
 * Utility for handling non-custodial Solana transactions.
 */
export const solanaBridge = {
  /**
   * Deserializes a Base64 transaction from the backend.
   */
  deserializeTx(base64: string): Transaction {
    if (!base64 || base64 === 'fixture' || base64.includes('mock-')) {
      return new Transaction();
    }
    try {
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
      }
      return Transaction.from(buffer);
    } catch (e) {
      console.error('[SolanaBridge] Deserialization failed:', e);
      return new Transaction();
    }
  },

  /**
   * Prompts the wallet to sign and then broadcasts the transaction.
   * Standardizes on the modern Wallet Standard 'features' approach but keep a fallback for 'signTransaction' if the provider is legacy.
   */
  async signAndBroadcast(
    connection: Connection,
    tx: Transaction,
    wallet: any
  ): Promise<string> {
    if (!wallet) {
      throw new Error('Wallet not connected. Please click "Re-authorize" in the navigation bar.');
    }

    // Fixture mode: backend returns 'fixture' sentinel → deserializeTx gives an empty Transaction.
    // Skip sign + broadcast entirely; finalize routes also no-op in fixture mode.
    if (tx.instructions.length === 0) {
      console.info('[SolanaBridge] Fixture transaction detected — skipping sign and broadcast.');
      return 'fixture-sig-' + Date.now()
    }

    let signedTx: Transaction;

    // 1. Resolve signing capability
    // We prefer the standard features approach as it is more robust and works better with Metamask (Solana Snaps)
    // because it avoids private field issues when the wallet object is behind a Vue proxy.
    const signFeature = wallet.features?.['solana:signTransaction'];
    
    if (signFeature) {
      // Wallet Standard (modern)
      const account = wallet.accounts[0];
      if (!account) throw new Error('No account found in connected wallet');

      const [{ signedTransaction }] = await signFeature.signTransaction({
        account,
        transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
      });
      signedTx = Transaction.from(signedTransaction);
    } else if (wallet.signTransaction) {
      // Legacy or Anchor-compatible wallet
      signedTx = await wallet.signTransaction(tx);
    } else {
      throw new Error('Connected wallet does not support transaction signing');
    }
    
    // 2. Broadcast
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // 3. Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  }
}
