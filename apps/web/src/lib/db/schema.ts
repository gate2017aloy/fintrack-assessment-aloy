import { pgTable, text, timestamp, integer, doublePrecision } from 'drizzle-orm/pg-core'

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  externalRef: text('external_ref'),
  amount: doublePrecision('amount'),
  currency: text('currency'),
  createdAt: timestamp('created_at'),
  status: text('status'),
})

export const reconciliations = pgTable('reconciliations', {
  id: text('id').primaryKey(),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  matchedCount: integer('matched_count'),
  unmatchedCount: integer('unmatched_count'),
  totalBankAmount: doublePrecision('total_bank_amount'),
  totalSystemAmount: doublePrecision('total_system_amount'),
  difference: doublePrecision('difference'),
  status: text('status'),
})

export const reconciliationRuns = pgTable('reconciliation_runs', {
  id: text('id').primaryKey(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})
