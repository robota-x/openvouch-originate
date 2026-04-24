import { Hono } from 'hono'
import { createAppDb } from '../db/client.js'
import type { AppEnv } from '../types.js'
import type { HeliusWebhookPayload } from '../webhooks/types.js'
import { handleGenericRecord } from '../webhooks/generic-record/handler.js'

export const webhookRoutes = new Hono<AppEnv>()

/**
 * POST /api/webhooks/helius
 *
 * Receives Helius enhanced-transaction webhook deliveries. Always returns 200
 * for authenticated requests so Helius does not retry valid deliveries.
 * Errors in individual transaction processing are logged, not propagated.
 *
 * Auth: Helius sends the value of `authHeader` (configured at webhook creation)
 * in the Authorization header. Validated against config.heliusWebhookAuth.
 */
webhookRoutes.post('/', async (c) => {
  const config = c.get('config')

  if (!config.heliusWebhookAuth) {
    return c.json({ error: 'webhook_not_configured' }, 401)
  }
  if (c.req.header('Authorization') !== config.heliusWebhookAuth) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  let payload: HeliusWebhookPayload
  try {
    payload = await c.req.json<HeliusWebhookPayload>()
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }
  if (!Array.isArray(payload)) {
    return c.json({ error: 'payload_must_be_array' }, 400)
  }

  // No DB = skip processing and return 200 so Helius does not retry
  const d1 = c.env?.DB
  if (!d1) return c.json({ ok: true }, 200)
  const db = createAppDb(d1)

  for (const tx of payload) {
    if (tx.transactionError) continue

    for (const instruction of tx.instructions) {
      if (instruction.programId === config.programs.genericRecord) {
        try {
          await handleGenericRecord(tx, instruction, db)
        } catch (err) {
          console.error('[webhooks] error processing instruction', tx.signature, err)
        }
      }
    }
  }

  return c.json({ ok: true }, 200)
})
