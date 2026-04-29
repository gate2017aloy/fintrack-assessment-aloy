import { describe, it, expect, vi } from 'vitest'
import { ReconcilerEngine, BankRecord, Payment } from './improved-reconciler'

describe('ReconcilerEngine', () => {
  const periodStart = new Date('2026-01-01T00:00:00Z')
  const periodEnd = new Date('2026-01-31T23:59:59Z')

  describe('reconcile (Pure Logic)', () => {
    it('should match a bank record to a payment by exact reference', () => {
      const bankData: BankRecord[] = [{
        transactionId: 'tx1',
        amount: 100.00,
        currency: 'USD',
        valueDate: '2026-01-15T10:00:00Z',
        description: 'Payment for order 123',
        reference: 'REF123'
      }]

      const systemPayments: Payment[] = [{
        id: 'pay1',
        externalRef: 'REF123',
        amount: 100.00,
        currency: 'USD',
        createdAt: new Date('2026-01-14T10:00:00Z'),
        status: 'pending'
      }]

      const result = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

      expect(result.matched).toHaveLength(1)
      expect(result.matched[0].bankRecord.transactionId).toBe('tx1')
      expect(result.matched[0].payment.id).toBe('pay1')
      expect(result.discrepancies).toHaveLength(0)
    })

    it('should identify a discrepancy when references match but amounts differ', () => {
      const bankData: BankRecord[] = [{
        transactionId: 'tx2',
        amount: 95.00, // Bank says 95
        currency: 'USD',
        valueDate: '2026-01-15T10:00:00Z',
        description: 'Partial payment',
        reference: 'REF456'
      }]

      const systemPayments: Payment[] = [{
        id: 'pay2',
        externalRef: 'REF456',
        amount: 100.00, // System says 100
        currency: 'USD',
        createdAt: new Date('2026-01-14T10:00:00Z'),
        status: 'pending'
      }]

      const result = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

      expect(result.matched).toHaveLength(0)
      expect(result.discrepancies).toHaveLength(1)
      expect(result.discrepancies[0].amountDelta).toBe(-5.00)
    })

    it('should fuzzy match by amount and date when no reference is provided', () => {
      const bankData: BankRecord[] = [{
        transactionId: 'tx3',
        amount: 50.00,
        currency: 'USD',
        valueDate: '2026-01-15T10:00:00Z',
        description: 'Generic deposit',
        reference: '' // No reference
      }]

      const systemPayments: Payment[] = [{
        id: 'pay3',
        externalRef: null,
        amount: 50.00,
        currency: 'USD',
        createdAt: new Date('2026-01-14T20:00:00Z'), // Close date
        status: 'pending'
      }]

      const result = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

      expect(result.matched).toHaveLength(1)
      expect(result.matched[0].payment.id).toBe('pay3')
    })

    it('should handle floating point precision correctly using cents', () => {
      const bankData: BankRecord[] = [{
        transactionId: 'tx4',
        amount: 0.1 + 0.2, // 0.30000000000000004 in IEEE 754
        currency: 'USD',
        valueDate: '2026-01-15T10:00:00Z',
        description: 'Float test',
        reference: 'REF_FLOAT'
      }]

      const systemPayments: Payment[] = [{
        id: 'pay4',
        externalRef: 'REF_FLOAT',
        amount: 0.3,
        currency: 'USD',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        status: 'pending'
      }]

      const result = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

      expect(result.matched).toHaveLength(1)
      expect(result.discrepancies).toHaveLength(0)
    })

    it('should ignore bank records outside the reporting period', () => {
      const bankData: BankRecord[] = [{
        transactionId: 'tx_old',
        amount: 10.00,
        currency: 'USD',
        valueDate: '2025-12-31T23:59:59Z', // Outside
        description: 'Last year',
        reference: 'OLD'
      }]

      const systemPayments: Payment[] = [{
        id: 'pay_old',
        externalRef: 'OLD',
        amount: 10.00,
        currency: 'USD',
        createdAt: new Date('2025-12-31T23:59:59Z'),
        status: 'pending'
      }]

      const result = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

      expect(result.matched).toHaveLength(0)
      expect(result.bankOnly).toHaveLength(0) // Filtered out completely
    })

    it('should correctly calculate summary totals', () => {
      const bankData: BankRecord[] = [
        { transactionId: 'b1', amount: 100, currency: 'USD', valueDate: '2026-01-10T00:00:00Z', description: '', reference: 'r1' },
        { transactionId: 'b2', amount: 50, currency: 'USD', valueDate: '2026-01-11T00:00:00Z', description: '', reference: 'r2' }
      ]

      const systemPayments: Payment[] = [
        { id: 's1', externalRef: 'r1', amount: 100, currency: 'USD', createdAt: new Date('2026-01-10'), status: 'pending' },
        { id: 's3', externalRef: 'r3', amount: 200, currency: 'USD', createdAt: new Date('2026-01-10'), status: 'pending' }
      ]

      const result = ReconcilerEngine.reconcile(bankData, systemPayments, periodStart, periodEnd)

      expect(result.summary.totalBankAmount).toBe(150)
      expect(result.summary.totalSystemAmount).toBe(300)
      expect(result.summary.difference).toBe(-150)
    })
  })
})
