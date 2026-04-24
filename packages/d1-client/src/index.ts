import { drizzle } from 'drizzle-orm/d1'

export function createDb<TSchema extends Record<string, unknown>>(
  d1: D1Database,
  schema: TSchema,
) {
  return drizzle(d1, { schema })
}

export type Db<TSchema extends Record<string, unknown>> =
  ReturnType<typeof createDb<TSchema>>
