'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

export default function PrincipalTuitionFeePage() {
  const [tab, setTab] = useState<'summary' | 'report' | 'waiver'>('summary')

  const [filterYear, setFilterYear] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterClass, setFilterClass] = useState('all')

  const [summaryData, setSummaryData] = useState<any[]>([])
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [waiverStudentId, setWaiverStudentId] = useState('')
  const [waiverAmount, setWaiverAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const months = [
    { value: 'all', label: 'All' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(2026, i).toLocaleString('en', { month: 'long' }) })),
  ]

  const summaryColumns = [
    { key: 'sl', label: 'SL No' },
    { key: 'total_due', label: 'Total Due' },
    { key: 'total_paid', label: 'Total Paid' },
  ]

  const reportColumns = [
    { key: 'sl', label: 'SL No' },
    { key: 'total_due', label: 'Total Due' },
    { key: 'total_paid', label: 'Total Paid' },
    { key: 'unpaid', label: 'Unpaid Due' },
  ]

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterYear !== 'all') params.set('year', filterYear)
      if (filterMonth !== 'all') params.set('month', filterMonth)
      if (filterClass !== 'all') params.set('class', filterClass)
      const qs = params.toString()
      const r: any = await api.get(`/principal/fees/summary${qs ? `?${qs}` : ''}`)
      const data = r.data || []
      setSummaryData(data.map((d: any, i: number) => ({ ...d, sl: i + 1 })))
    } catch { setSummaryData([]) } finally { setLoading(false) }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year: filterYear !== 'all' ? filterYear : String(new Date().getFullYear()) })
      if (filterClass !== 'all') params.set('class', filterClass)
      if (filterMonth !== 'all') params.set('month', filterMonth)
      const r: any = await api.get(`/principal/fees/report?${params.toString()}`)
      const data = r.data || []
      setReportData(data.map((d: any, i: number) => ({ ...d, sl: i + 1 })))
    } catch { setReportData([]) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (tab === 'summary') fetchSummary()
    else if (tab === 'report') fetchReport()
  }, [tab])

  const handleApplyWaiver = async () => {
    if (!waiverStudentId || !waiverAmount) return
    setSubmitting(true)
    try {
      await api.post('/principal/fees/waiver', {
        student_id: waiverStudentId,
        amount: Number(waiverAmount),
      })
      alert('Waiver applied successfully')
      setWaiverStudentId('')
      setWaiverAmount('')
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }

  return (
    <PanelLayout role="principal" title="Tuition Fee">
      <div className="mb-4 flex gap-2">
        {(['summary', 'report', 'waiver'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {tab !== 'waiver' && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Year" options={[{ value: 'all', label: 'All' }, ...years]} value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
              <Select label="Month" options={months} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
              <Select label="Class" options={[{ value: 'all', label: 'All' }, { value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} value={filterClass} onChange={(e) => setFilterClass(e.target.value)} />
            </div>
            <Button onClick={tab === 'summary' ? fetchSummary : fetchReport}>Apply Filters</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'summary' && (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={summaryColumns} data={summaryData} loading={loading} emptyMessage="No fee data" />
          </CardContent>
        </Card>
      )}

      {tab === 'report' && (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={reportColumns} data={reportData} loading={loading} emptyMessage="No fee data" />
          </CardContent>
        </Card>
      )}

      {tab === 'waiver' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Student ID" placeholder="Enter Student ID" value={waiverStudentId} onChange={(e) => setWaiverStudentId(e.target.value)} />
              <Input label="Waiver Amount (BDT)" type="number" value={waiverAmount} onChange={(e) => setWaiverAmount(e.target.value)} />
            </div>
            <Button onClick={handleApplyWaiver} disabled={submitting || !waiverStudentId || !waiverAmount}>
              {submitting ? 'Applying...' : 'Apply Waiver'}
            </Button>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
