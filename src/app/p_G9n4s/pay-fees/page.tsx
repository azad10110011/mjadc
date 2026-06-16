'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Badge } from '@/components/ui'
import { MONTHS } from '@/types'
import { api } from '@/lib/api'

interface FeeRecord {
  id: number
  year: number
  month: number
  amount_due: string
  amount_paid: string
  waiver_amount: string
  outstanding: string
  paid_at: string | null
}

export default function StudentPayFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [paying, setPaying] = useState<number | null>(null)

  useEffect(() => {
    api.get<{ data: FeeRecord[] }>('/student/fees').then((res) => {
      setFees(res.data)
    }).catch(() => {})
  }, [])

  const totalDue = fees.reduce((s, f) => s + Number(f.amount_due), 0)
  const totalPaid = fees.reduce((s, f) => s + Number(f.amount_paid), 0)
  const outstanding = fees.reduce((s, f) => s + Number(f.outstanding), 0)

  async function handlePay(feeId: number) {
    setPaying(feeId)
    try {
      const res = await api.post<{ data: { transaction_id: string; payment_url: string } }>('/student/pay-fee', { fee_id: feeId })
      if (res.data.payment_url) {
        window.open(res.data.payment_url, '_blank')
      }
      alert('Payment initiated. Transaction ID: ' + res.data.transaction_id)
    } catch (err: unknown) {
      alert('Payment failed: ' + (err instanceof Error ? err.message : 'Error'))
    } finally {
      setPaying(null)
    }
  }

  function getFeeForMonth(monthIdx: number) {
    return fees.find((f) => f.month === monthIdx + 1)
  }

  return (
    <PanelLayout role="student" title="Pay Fees">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Total Due:</span> <span className="font-medium">৳{totalDue}</span></div>
            <div><span className="text-gray-500">Total Paid:</span> <span className="font-medium text-green-600">৳{totalPaid}</span></div>
            <div><span className="text-gray-500">Outstanding:</span> <span className="font-medium text-red-600">৳{outstanding}</span></div>
          </div>
          <h3 className="mb-3 font-semibold text-gray-900">Monthly Breakdown</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MONTHS.map((month, i) => {
              const fee = getFeeForMonth(i)
              const isPaid = fee && Number(fee.outstanding) <= 0
              return (
                <div key={month}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    isPaid ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{month}</span>
                  <div className="flex items-center gap-2">
                    {fee ? (
                      isPaid ? (
                        <Badge variant="success">Paid</Badge>
                      ) : (
                        <>
                          <span className="text-xs text-red-500">৳{Number(fee.outstanding).toFixed(0)}</span>
                          <Button size="sm" variant="primary" onClick={() => handlePay(fee.id)} disabled={paying === fee.id}>
                            {paying === fee.id ? '...' : 'Pay'}
                          </Button>
                        </>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">No record</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
