import { eq, between, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { payments, reconciliations } from '@/lib/db/schema'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BankRecord {
  transactionId: string
  amount: number          // dollar value, e.g. 19.99
  currency: string
  valueDate: string       // ISO date string from bank, e.g. "2026-01-15T14:30:00"
  description: string
  reference: string
}

export interface Payment {
  id: string
  externalRef: string | null
  amount: number | null
  currency: string | null
  createdAt: Date | null
  status: string | null
}

export interface ReconciliationResult {
  id: string
  matched: MatchedPair[]
  unmatched: { bankOnly: BankRecord[]; systemOnly: Payment[] }
  discrepancies: Discrepancy[]
  summary: {
    totalBankAmount: number
    totalSystemAmount: number
    difference: number
  }
}

export interface MatchedPair {
  bankRecord: BankRecord
  payment: Payment
}

export interface Discrepancy {
  bankRecord: BankRecord
  payment: Payment
  amountDelta: number
}

// ─── Pure Logic (Deterministic Engine) ───────────────────────────────────────
// This section contains logic that doesn't perform I/O, making it ideal for 
// Temporal workflow logic or unit testing.

export const ReconcilerEngine = {
  /**
   * Converts a dollar amount to cents to avoid floating-point errors.
   */
  toCents(amount: number): number {
    return Math.round(amount * 100)
  },

  /**
   * Converts cents back to a dollar amount.
   */
  fromCents(cents: number): number {
    return cents / 100
  },

  /**
   * Normalizes bank dates to UTC.
   */
  parseBankDate(isoString: string): Date {
    const normalized = isoString.endsWith('Z') ? isoString : `${isoString}Z`
    const date = new Date(normalized)
    return isNaN(date.getTime()) ? new Date(isoString) : date
  },

  /**
   * Core reconciliation algorithm.
   * Pure function: takes data, returns results. No side effects.
   */
  reconcile(
    bankData: BankRecord[],
    systemPayments: Payment[],
    periodStart: Date,
    periodEnd: Date
  ) {
    const matched: MatchedPair[] = []
    const discrepancies: Discrepancy[] = []
    const matchedPaymentIds = new Set<string>()
    const matchedBankIds = new Set<string>()

    // Prepare lookup maps
    const paymentsByRef = new Map<string, Payment[]>()
    const paymentsByAmount = new Map<string, Payment[]>()

    for (const p of systemPayments) {
      if (p.externalRef) {
        if (!paymentsByRef.has(p.externalRef)) paymentsByRef.set(p.externalRef, [])
        paymentsByRef.get(p.externalRef)!.push(p)
      }
      const amountKey = `${p.currency}_${this.toCents(p.amount || 0)}`
      if (!paymentsByAmount.has(amountKey)) paymentsByAmount.set(amountKey, [])
      paymentsByAmount.get(amountKey)!.push(p)
    }

    // Filter and sort bank data
    const relevantBankData = bankData
      .filter(r => {
        const d = this.parseBankDate(r.valueDate)
        return d >= periodStart && d < periodEnd
      })
      .sort((a, b) => 
        this.parseBankDate(a.valueDate).getTime() - this.parseBankDate(b.valueDate).getTime()
      )

    for (const bankRecord of relevantBankData) {
      const bankDate = this.parseBankDate(bankRecord.valueDate)
      const bankAmountCents = this.toCents(bankRecord.amount)
      let foundPayment: Payment | undefined

      // Tier 1: Reference Match
      if (bankRecord.reference && paymentsByRef.has(bankRecord.reference)) {
        const p = paymentsByRef.get(bankRecord.reference)!.find(c => !matchedPaymentIds.has(c.id))
        if (p) {
          foundPayment = p
          const sysCents = this.toCents(p.amount || 0)
          if (bankAmountCents === sysCents) {
            matched.push({ bankRecord, payment: p })
          } else {
            discrepancies.push({
              bankRecord,
              payment: p,
              amountDelta: this.fromCents(bankAmountCents - sysCents)
            })
          }
        }
      }

      // Tier 2: Fuzzy Match
      if (!foundPayment) {
        const amountKey = `${bankRecord.currency}_${bankAmountCents}`
        const candidates = paymentsByAmount.get(amountKey) || []
        let bestCandidate: Payment | undefined
        let minDiff = 3 * 24 * 60 * 60 * 1000 // 3 days

        for (const p of candidates) {
          if (matchedPaymentIds.has(p.id)) continue
          const pDate = p.createdAt ? new Date(p.createdAt) : new Date(0)
          const diff = Math.abs(bankDate.getTime() - pDate.getTime())
          if (diff < minDiff) {
            minDiff = diff
            bestCandidate = p
          }
        }

        if (bestCandidate) {
          foundPayment = bestCandidate
          matched.push({ bankRecord, payment: bestCandidate })
        }
      }

      if (foundPayment) {
        matchedPaymentIds.add(foundPayment.id)
        matchedBankIds.add(bankRecord.transactionId)
      }
    }

    const totalBankAmountCents = relevantBankData.reduce((sum, r) => sum + this.toCents(r.amount), 0)
    const totalSystemAmountCents = systemPayments.reduce((sum, p) => sum + this.toCents(p.amount || 0), 0)

    return {
      matched,
      discrepancies,
      bankOnly: relevantBankData.filter(r => !matchedBankIds.has(r.transactionId)),
      systemOnly: systemPayments.filter(p => !matchedPaymentIds.has(p.id)),
      summary: {
        totalBankAmount: this.fromCents(totalBankAmountCents),
        totalSystemAmount: this.fromCents(totalSystemAmountCents),
        difference: this.fromCents(totalBankAmountCents - totalSystemAmountCents)
      }
    }
  }
}

// ─── Activities (I/O Operations) ─────────────────────────────────────────────
// These functions represent side effects that would be Temporal Activities.

export const ReconcilerActivities = {
  async fetchSystemPayments(tx: any, periodStart: Date, periodEnd: Date): Promise<Payment[]> {
    const raw = await tx
      .select()
      .from(payments)
      .where(
        and(
          between(payments.createdAt, periodStart, periodEnd),
          eq(payments.status, 'pending')
        )
      )
      .for('update')
    
    return raw.map((p: any) => ({
      id: p.id,
      externalRef: p.externalRef,
      amount: p.amount,
      currency: p.currency,
      createdAt: p.createdAt,
      status: p.status
    }))
  },

  async markPaymentsReconciled(tx: any, paymentIds: string[]): Promise<void> {
    if (paymentIds.length === 0) return
    await tx
      .update(payments)
      .set({ status: 'reconciled' })
      .where(inArray(payments.id, paymentIds))
  },

  async saveReconciliationRecord(tx: any, data: any): Promise<string> {
    const [saved] = await tx.insert(reconciliations).values({
      id: crypto.randomUUID(),
      ...data,
      status: 'complete'
    }).returning()
    return saved.id
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────────────
// This is the main entry point, analogous to a Temporal Workflow.

export async function reconcilePaymentsImproved(
  bankData: BankRecord[],
  periodStart: Date,
  periodEnd: Date
): Promise<ReconciliationResult> {
  return await db.transaction(async (tx) => {
    // 1. Fetch data (Activity)
    const systemPayments = await ReconcilerActivities.fetchSystemPayments(tx, periodStart, periodEnd)

    // 2. Run matching logic (Pure Logic)
    const engineResult = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

    // 3. Update system state (Activity)
    const matchedIds = engineResult.matched.map(m => m.payment.id)
    const discrepancyIds = engineResult.discrepancies.map(d => d.payment.id)
    await ReconcilerActivities.markPaymentsReconciled(tx, [...matchedIds, ...discrepancyIds])

    // 4. Save results (Activity)
    const runId = await ReconcilerActivities.saveReconciliationRecord(tx, {
      periodStart,
      periodEnd,
      matchedCount: engineResult.matched.length,
      unmatchedCount: engineResult.bankOnly.length + engineResult.systemOnly.length,
      totalBankAmount: engineResult.summary.totalBankAmount,
      totalSystemAmount: engineResult.summary.totalSystemAmount,
      difference: engineResult.summary.difference
    })

    return {
      id: runId,
      ...engineResult,
      unmatched: {
        bankOnly: engineResult.bankOnly,
        systemOnly: engineResult.systemOnly
      }
    }
  })
}
