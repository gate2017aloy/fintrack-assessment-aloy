'use client'

import { useState, useEffect } from 'react'
import { 
  Badge, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Button
} from '@/components/ui'

interface ReconciliationRun {
  id: string
  periodStart: string
  periodEnd: string
  matchedCount: number
  unmatchedCount: number
  difference: number
  status: 'pending' | 'running' | 'complete' | 'failed'
}

export function ReconciliationDashboard() {
  const [runs, setRuns] = useState<ReconciliationRun[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/reconcile')
        const data = await res.json()
        setRuns(data.runs ?? [])
      } catch (err) {
        console.error('Failed to fetch runs:', err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const badgeClass: Record<ReconciliationRun['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  const now = new Date()
  const runsThisMonth = runs.filter(run => {
    const d = new Date(run.periodStart)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const totalDiscrepancy = runs.reduce((sum, run) => sum + (run.difference || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reconciliation</h1>
          <p className="text-gray-500 mt-1">Monitor and manage payment matching across systems.</p>
        </div>
        <Button 
          disabled 
          title="Automated reconciliation is currently managed by system scheduler."
          className="shadow-sm"
        >
          Trigger New Reconciliation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Total Runs This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{runsThisMonth}</div>
            <p className="text-xs text-gray-400 mt-1">Targeting 100% accuracy</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Total Discrepancy Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalDiscrepancy !== 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatAmount(totalDiscrepancy)}
            </div>
            <p className="text-xs text-gray-400 mt-1">Cumulative across all historical runs</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Badge className="bg-blue-50 text-blue-700 border-blue-100">
            {runs.length} Total Records
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Reporting Period</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Unmatched</TableHead>
                <TableHead>Discrepancy</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-400 italic">
                    No reconciliation records found.
                  </TableCell>
                </TableRow>
              ) : (
                runs.map(run => (
                  <TableRow key={run.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="pl-6 font-medium">
                      {new Date(run.periodStart).toLocaleDateString()} – {new Date(run.periodEnd).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600 font-semibold">{run.matchedCount}</span>
                    </TableCell>
                    <TableCell>
                      <span className={run.unmatchedCount > 0 ? 'text-red-500' : 'text-gray-400'}>
                        {run.unmatchedCount}
                      </span>
                    </TableCell>
                    <TableCell className={run.difference !== 0 ? 'font-bold text-amber-600' : 'text-gray-900'}>
                      {formatAmount(run.difference)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge className={`${badgeClass[run.status]} border`}>
                        {run.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
