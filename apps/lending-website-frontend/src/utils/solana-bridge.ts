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
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return Transaction.from(bytes)
  },

  /**
   * Prompts the wallet to sign and then broadcasts the transaction.
   * Note: This depends on the Wallet Standard integration.
   */
  async signAndBroadcast(
    connection: Connection,
    tx: Transaction,
    wallet: { signTransaction: (tx: Transaction) => Promise<Transaction>, publicKey: string }
  ): Promise<string> {
    // 1. Sign
    const signedTx = await wallet.signTransaction(tx)
    
    // 2. Broadcast
    const signature = await connection.sendRawTransaction(signedTx.serialize())
    
    // 3. Wait for confirmation (optional, can also be done in backend)
    await connection.confirmTransaction(signature, 'confirmed')
    
    return signature
  }
}
