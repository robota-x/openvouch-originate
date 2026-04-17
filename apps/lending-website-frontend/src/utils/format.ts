/** Abbreviated money display — $1.5k, $500. Used for recap stat pills. */
export function fmt(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

/** Truncate a wallet address to first 4 + … + last 4 chars. */
export function truncate(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}
