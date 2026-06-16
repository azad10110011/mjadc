'use client'

import { useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

const FEE_TYPES = [
  'Tuition Fee',
  'Exam Fee',
  'Testimonial Fee',
  'Registration Fee',
  'Practical Fee',
  'Other Academic Charges',
]

export default function AdminCollectedSummaryPage() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)
  const [collectedBy, setCollectedBy] = useState('')
  const [feeType, setFeeType] = useState('')
  const [year, setYear] = useState('')
  const [collectors, setCollectors] = useState<string[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))

  const handleSearch = async () => {
    if (!from || !to) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (collectedBy) params.set('collected_by', collectedBy)
      if (feeType) params.set('fee_type', feeType)
      if (year) params.set('year', year)
      const res = await api.get<{ status: number; data: any }>(`/admin/fees/collected-summary?${params}`)
      setData(res.data)
      if (res.data.collectors) setCollectors(res.data.collectors)
    } catch (e: any) {
      alert(e.message)
      setData(null)
    }
    setLoading(false)
  }

  const columns = [
    { key: 'transaction_id', label: 'Transaction ID' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'student_name', label: 'Student' },
    { key: 'fee_type', label: 'Fee Type' },
    { key: 'year_paid', label: 'Year' },
    { key: 'amount', label: 'Amount' },
    { key: 'collected_by', label: 'Collected By' },
    { key: 'date', label: 'Date' },
  ]

  const rows = (data?.payments || []).map((p: any) => ({
    transaction_id: p.transaction_id,
    student_id: p.student_id,
    student_name: p.student_name,
    fee_type: p.fee_type || 'Tuition Fee',
    year_paid: p.year_paid || '-',
    amount: Number(p.amount).toLocaleString(),
    collected_by: p.collected_by || '-',
    date: p.created_at ? new Date(p.created_at).toLocaleString() : '-',
  }))

  return (
    <PanelLayout role="admin" title="Collected Amount Summary">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          <div className="flex flex-wrap items-end gap-3">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Select label="Collected By" options={[{ value: '', label: 'All' }, ...collectors.map((c) => ({ value: c, label: c }))]} value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
            <Select label="Fee Type" options={[{ value: '', label: 'All' }, ...FEE_TYPES.map((f) => ({ value: f, label: f }))]} value={feeType} onChange={(e) => setFeeType(e.target.value)} />
            <Select label="Year" options={[{ value: '', label: 'All' }, ...years]} value={year} onChange={(e) => setYear(e.target.value)} />
            <Button onClick={handleSearch} disabled={loading}>{loading ? 'Loading...' : 'Search'}</Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-blue-600">{Number(data.total_amount).toLocaleString()} BDT</p><p className="text-xs text-gray-500">Total Collected</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-gray-900">{data.total_transactions}</p><p className="text-xs text-gray-500">Transactions</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-sm text-gray-600">{data.from} — {data.to}</p><p className="text-xs text-gray-500">Date Range</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-gray-500">{feeType || 'All'} / {year || 'All'}</p><p className="text-xs text-gray-400">Fee Type / Year</p></CardContent></Card>
          </div>

          {rows.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <DataTable columns={columns} data={rows} emptyMessage="No payments found" />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PanelLayout>
  )
}
