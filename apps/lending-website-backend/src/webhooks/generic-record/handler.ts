import { BorshCoder } from '@anchor-lang/core'
import idl from '../../idl/generic_record.json' assert { type: 'json' }
import { chainEvents } from '../../db/schema.js'
import type { Db } from '../../db/client.js'
import type { EnhancedTransaction, Instruction } from '../types.js'

// BorshCoder is initialised once per module. It uses the IDL to:
//   1. match instruction discriminators against incoming data
//   2. Borsh-decode the instruction arguments
//
// NOTE: The discriminator bytes in the IDL are placeholders until `anchor build`
// generates the real IDL. Replace src/idl/generic_record.json with the output of:
//   cp target/idl/generic_record.json apps/lending-website-backend/src/idl/
// After that, instruction decoding will work against real on-chain transactions.
// Until then, coder.instruction.decode() returns null for all inputs (wrong discriminator).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coder = new BorshCoder(idl as any)

interface CreateRecordArgs {
  txLink:      string | null
  externalUrl: string | null
  text:        string
}

/**
 * Attempt to decode and persist any recognised instruction from the generic-record
 * program. Returns without error if the instruction is unrecognised or fails to
 * decode — the caller logs and moves on.
 *
 * Idempotent: duplicate txSignature inserts are silently ignored via PRIMARY KEY
 * constraint (Solana signatures are globally unique; re-delivery is safe to skip).
 */
export async function handleGenericRecord(
  tx: EnhancedTransaction,
  instruction: Instruction,
  db: Db,
): Promise<void> {
  const decoded = coder.instruction.decode(instruction.data, 'base58')
  if (!decoded) return  // unrecognised discriminator — not our instruction

  if (decoded.name === 'createRecord') {
    await persistCreateRecord(tx, instruction, decoded.data as CreateRecordArgs, db)
    return
  }

  // Known program, unknown instruction — log for visibility but don't error
  console.info('[generic-record] unrecognised instruction:', decoded.name, tx.signature)
}

async function persistCreateRecord(
  tx: EnhancedTransaction,
  instruction: Instruction,
  args: CreateRecordArgs,
  db: Db,
): Promise<void> {
  try {
    await db.insert(chainEvents).values({
      txSignature:  tx.signature,
      blockTime:    new Date(tx.timestamp * 1000),
      programId:    instruction.programId,
      contractType: 'createRecord',
      data: JSON.stringify({
        signer1:     instruction.accounts[0] ?? null,
        signer2:     instruction.accounts[1] ?? null,
        txLink:      args.txLink ?? null,
        externalUrl: args.externalUrl ?? null,
        text:        args.text,
      }),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE constraint failed')) {
      // Helius re-delivered a transaction we already processed — safe to skip
      console.info('[generic-record] duplicate delivery, skipping', tx.signature)
      return
    }
    throw err
  }
}
