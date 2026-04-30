/**
 * Solana standard: 1 SOL = 1,000,000,000 Lamports.
 */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/**
 * Converts a SOL string (e.g. "1.23") to lamports (bigint).
 * Handles up to 9 decimal places.
 * Uses string manipulation to avoid floating point precision issues.
 */
export function toLamports(sol: string): bigint {
  if (!sol) return 0n;
  const [integerPart, fractionalPart = ""] = sol.split(".");
  const paddedFractionalPart = fractionalPart.padEnd(9, "0").slice(0, 9);
  return BigInt(integerPart + paddedFractionalPart);
}

/**
 * Converts lamports (bigint) to a SOL string (e.g. "1.23").
 * Trims trailing zeros.
 * Uses string manipulation to avoid floating point precision issues.
 */
export function toSol(lamports: bigint): string {
  const s = lamports.toString().padStart(10, "0");
  const integerPart = s.slice(0, -9);
  const fractionalPart = s.slice(-9).replace(/0+$/, "");
  return fractionalPart.length > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
}
