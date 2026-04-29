/** Abbreviated money display — $1.5k, $500. Used for recap stat pills. */
export function fmt(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

/** Truncate a wallet address to first N + … + last 4 chars. */
export function truncate(addr: string, chars = 4): string {
  if (addr.length <= chars + 4) return addr
  return `${addr.slice(0, chars)}…${addr.slice(-4)}`
}

/** 
 * Format a date string or timestamp to international format (dd/mm/yyyy).
 */
export function fmtDate(iso: string | number | Date): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric'
  })
}

/**
 * Format a partial date (YYYY-MM) to human-readable month/year.
 */
export function fmtMonthYear(iso: string): string {
  // If we only have YYYY-MM, append -01 to make it a valid date for parsing
  const d = new Date(iso.includes('-') && iso.split('-').length === 2 ? `${iso}-01` : iso)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
