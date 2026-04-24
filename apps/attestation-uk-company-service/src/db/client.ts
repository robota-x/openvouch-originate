import { createDb } from '@openvouch/d1-client'
import * as schema from './schema.js'

export const createAppDb = (d1: D1Database) => createDb(d1, schema)
export type Db = ReturnType<typeof createAppDb>
