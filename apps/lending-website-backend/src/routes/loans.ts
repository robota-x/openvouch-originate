import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../plugins/auth.js'

type IdParams       = { id: string }
type CreateLoanBody = { amount: number; currency: string; apy: number; duration: number }
type PatchLoanBody  = { amount?: number; currency?: string; apy?: number; duration?: number }

type ListLoansQuery = {
  minTrustScore?:    number
  minApy?:           number
  maxApy?:           number
  minAmount?:        number
  maxAmount?:        number
  maxDuration?:      number
  minAttestations?:  number
  minRepaymentRate?: number
}

/** GET /api/loans — list open loan requests with optional filters. Sorting is a display concern handled client-side. */
const listLoansSchema = {
  querystring: {
    type: 'object',
    properties: {
      minTrustScore:    { type: 'number' },
      minApy:           { type: 'number' },
      maxApy:           { type: 'number' },
      minAmount:        { type: 'number' },
      maxAmount:        { type: 'number' },
      maxDuration:      { type: 'number' },
      minAttestations:  { type: 'number' },
      minRepaymentRate: { type: 'number' },
    },
    additionalProperties: false,
  },
} as const

/** POST /api/loans — borrower creates a new open loan request. */
const createLoanSchema = {
  body: {
    type: 'object',
    required: ['amount', 'currency', 'apy', 'duration'],
    properties: {
      amount:   { type: 'number', exclusiveMinimum: 0 },
      currency: { type: 'string', minLength: 1 },
      apy:      { type: 'number', exclusiveMinimum: 0 },
      duration: { type: 'integer', minimum: 1 },
    },
    additionalProperties: false,
  },
} as const

/** PATCH /api/loans/:id — update terms while the listing is still open (pre-match). */
const patchLoanSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      amount:   { type: 'number', exclusiveMinimum: 0 },
      currency: { type: 'string', minLength: 1 },
      apy:      { type: 'number', exclusiveMinimum: 0 },
      duration: { type: 'integer', minimum: 1 },
    },
    additionalProperties: false,
  },
} as const

const idParamsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
} as const

const loanRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: ListLoansQuery }>('/', { schema: listLoansSchema }, async (_request, reply) => {
    // TODO: return open loan listings from off-chain store, enriched with borrower chain data; apply query filters
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.post<{ Body: CreateLoanBody }>('/', { schema: createLoanSchema, preHandler: authenticate }, async (_request, reply) => {
    // TODO: create loan listing for request.user.address; persist off-chain
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.get<{ Params: IdParams }>('/:id', { schema: idParamsSchema }, async (_request, reply) => {
    // TODO: return single loan listing enriched with borrower chain data; 404 if not found
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.patch<{ Params: IdParams; Body: PatchLoanBody }>('/:id', { schema: patchLoanSchema, preHandler: authenticate }, async (_request, reply) => {
    // TODO: verify request.user.address owns this listing and it is still open; apply partial update
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.delete<{ Params: IdParams }>('/:id', { schema: idParamsSchema, preHandler: authenticate }, async (_request, reply) => {
    // TODO: verify ownership and open status; remove listing; 404 if not found
    reply.code(501).send({ error: 'not_implemented' })
  })

  fastify.post<{ Params: IdParams }>('/:id/fund', { schema: idParamsSchema, preHandler: authenticate }, async (_request, reply) => {
    // TODO: verify listing is open and request.user is not the borrower; lock listing; initiate on-chain disbursement tx
    reply.code(501).send({ error: 'not_implemented' })
  })
}

export default loanRoutes
