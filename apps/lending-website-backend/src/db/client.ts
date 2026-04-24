import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema.js'

export type Db = ReturnType<typeof createDb>

/** Wrap a D1Database binding with Drizzle for type-safe queries. */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}
