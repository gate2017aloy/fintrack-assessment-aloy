import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { reconciliationRuns, reconciliations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { reconcilePaymentsImproved as reconcilePayments, BankRecord } from '@/lib/services/reconciliation/improved-reconciler'
import { getSession } from './auth'

// This is a forced update to resolve stale build issues.

const ReconcileRequestSchema = z.object({
  bankData: z.array(
    z.object({
      transactionId: z.string(),
      amount: z.number(),
      currency: z.string(),
      valueDate: z.string(),
      description: z.string(),
      reference: z.string(),
    }),
  ),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate input
    const body = await req.json()
    const parsedResult = ReconcileRequestSchema.safeParse(body)
    
    if (!parsedResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: parsedResult.error.flatten() 
      }, { status: 400 })
    }

    const parsed = parsedResult.data
    const runId = crypto.randomUUID()

    // 3. Save run metadata securely (No more SQL injection)
    await db.insert(reconciliationRuns).values({
      id: runId,
      notes: parsed.notes ?? '',
    })

    // 4. Perform reconciliation
    const result = await reconcilePayments(
      parsed.bankData as BankRecord[],
      new Date(parsed.periodStart),
      new Date(parsed.periodEnd),
    )

    return NextResponse.json({ runId, ...result }, { status: 201 })
  } catch (error: any) {
    // Log the actual error internally
    console.error('Reconciliation failed:', error)
    
    // Do not expose internal error details to the caller
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      // Secure retrieval for a specific reconciliation
      const results = await db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.id, id))

      if (results.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      return NextResponse.json(results[0])
    }

    // Return all reconciliations if no ID is provided
    const allResults = await db
      .select()
      .from(reconciliations)
      .orderBy(reconciliations.periodStart)

    return NextResponse.json({ runs: allResults })
  } catch (error) {
    console.error('Failed to fetch reconciliation run:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}