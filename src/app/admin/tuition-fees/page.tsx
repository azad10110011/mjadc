'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Textarea, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

const FEE_TYPES = [
  'Tuition Fee',
  'Exam Fee',
  'Testimonial Fee',
  'Registration Fee',
  'Practical Fee',
  'Other Academic Charges',
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface FeeRecord {
  student_id: string
  student_name: string
  class: string
  total_due: number
  total_paid: number
  unpaid: number
}

export default function AdminTuitionFeesPage() {
  const [tab, setTab] = useState<'summary' | 'add' | 'waiver'>('summary')
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [year, setYear] = useState('all')
  const [month, setMonth] = useState('all')
  const [class_, setClass_] = useState('all')

  const [studentMode, setStudentMode] = useState<'single' | 'all'>('single')
  const [studentId, setStudentId] = useState('')
  const [targetClass, setTargetClass] = useState('')
  const [feeType, setFeeType] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [waiverStudentId, setWaiverStudentId] = useState('')
  const [waiverAmount, setWaiverAmount] = useState('')
  const [waiverReason, setWaiverReason] = useState('')
  const [waiverSubmitting, setWaiverSubmitting] = useState(false)
  const [waiverStudentData, setWaiverStudentData] = useState<any | null>(null)
  const [waiverSearchLoading, setWaiverSearchLoading] = useState(false)
  const [waiverSearchError, setWaiverSearchError] = useState('')

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const months = [
    { value: 'all', label: 'All' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: MONTH_NAMES[i] })),
  ]

  const fetchFees = () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (year !== 'all') params.set('year', year)
    if (month !== 'all') params.set('month', month)
    if (class_ !== 'all') params.set('class', class_)
    api.get<{ status: number; data: FeeRecord[] }>(`/admin/tuition-fees?${params}`)
      .then((res) => setFees(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load fee data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (tab === 'summary') fetchFees() }, [tab])

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  const resetAddForm = () => {
    setStudentMode('single'); setStudentId(''); setTargetClass(''); setFeeType(''); setAmount(''); setSelectedMonths([]); setNote('')
  }

  const handleAddFee = async () => {
    if (!feeType || !amount) { alert('Fee type and amount are required'); return }
    if (studentMode === 'single' && !studentId) { alert('Student ID is required'); return }
    if (studentMode === 'all' && !targetClass) { alert('Class is required when adding fee for all students'); return }
    if (feeType === 'Tuition Fee' && selectedMonths.length === 0) { alert('Select at least one month for Tuition Fee'); return }
    setSubmitting(true)
    try {
      const payload: any = {
        fee_type: feeType,
        amount: Number(amount),
        months: feeType === 'Tuition Fee' ? selectedMonths : undefined,
        note: feeType === 'Other Academic Charges' ? note : undefined,
      }
      if (studentMode === 'single') {
        payload.student_id = studentId
      } else {
        payload.class = targetClass
      }
      await api.post('/admin/fees/add', payload)
      alert('Fee added successfully')
      resetAddForm()
      fetchFees()
    } catch (e: any) {
      alert(e.message || 'Failed to add fee')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWaiverSearch = async () => {
    if (!waiverStudentId) return
    setWaiverSearchLoading(true)
    setWaiverSearchError('')
    setWaiverStudentData(null)
    try {
      const res = await api.get<{ status: number; data: any }>(`/admin/fees/student-due?student_id=${encodeURIComponent(waiverStudentId)}`)
      setWaiverStudentData(res.data)
    } catch (err: unknown) {
      setWaiverSearchError(err instanceof Error ? err.message : 'Student not found')
    }
    setWaiverSearchLoading(false)
  }

  const handleWaiver = async () => {
    if (!waiverStudentId || !waiverAmount) { alert('Student ID and waiver amount are required'); return }
    setWaiverSubmitting(true)
    try {
      await api.post('/admin/fees/waiver', {
        student_id: waiverStudentId,
        amount: Number(waiverAmount),
        reason: waiverReason || undefined,
      })
      alert('Waiver applied successfully')
      setWaiverStudentId(''); setWaiverAmount(''); setWaiverReason('')
      fetchFees()
    } catch (e: any) {
      alert(e.message || 'Failed to apply waiver')
    } finally {
      setWaiverSubmitting(false)
    }
  }

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'student_name', label: 'Student' },
    { key: 'class', label: 'Class' },
    { key: 'total_due', label: 'Total Due' },
    { key: 'total_paid', label: 'Total Paid' },
    { key: 'unpaid', label: 'Unpaid' },
  ]

  const rows = fees.map((f) => ({
    ...f,
    total_due: Number(f.total_due).toLocaleString(),
    total_paid: Number(f.total_paid).toLocaleString(),
    unpaid: Number(f.unpaid).toLocaleString(),
  }))

  const totals = fees.reduce(
    (acc, f) => ({
      due: acc.due + Number(f.total_due),
      paid: acc.paid + Number(f.total_paid),
      unpaid: acc.unpaid + Number(f.unpaid),
    }),
    { due: 0, paid: 0, unpaid: 0 }
  )

  return (
    <PanelLayout role="admin" title="Tuition Fee Management">
      <div className="mb-4 flex gap-2">
        {(['summary', 'add', 'waiver'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'primary' : 'secondary'} onClick={() => setTab(t)}>
            {t === 'summary' ? 'Summary' : t === 'add' ? 'Add Fee' : 'Waiver'}
          </Button>
        ))}
      </div>

      {tab === 'summary' && (
        <>
          {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Card className="mb-6">
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Select label="Year" options={[{ value: 'all', label: 'All' }, ...years]} value={year} onChange={(e) => setYear(e.target.value)} />
                <Select label="Month" options={months} value={month} onChange={(e) => setMonth(e.target.value)} />
                <Select label="Class" options={[{ value: 'all', label: 'All' }, { value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} value={class_} onChange={(e) => setClass_(e.target.value)} />
              </div>
              <Button onClick={fetchFees}>Apply Filters</Button>
            </CardContent>
          </Card>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-gray-900">{fees.length}</p><p className="text-xs text-gray-500">Students</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-blue-600">{totals.due.toLocaleString()}</p><p className="text-xs text-gray-500">Total Due</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{totals.paid.toLocaleString()}</p><p className="text-xs text-gray-500">Total Paid</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-red-600">{totals.unpaid.toLocaleString()}</p><p className="text-xs text-gray-500">Total Unpaid</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No fee data" />
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'add' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-gray-900">Add New Fee</h3>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Student</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="studentMode" checked={studentMode === 'single'} onChange={() => setStudentMode('single')} /> Specific Student
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="studentMode" checked={studentMode === 'all'} onChange={() => setStudentMode('all')} /> All Students
                </label>
              </div>
            </div>

            {studentMode === 'single' ? (
              <Input label="Student ID" placeholder="Enter Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            ) : (
              <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]} value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)} placeholder="Select Class" />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Fee Type" options={FEE_TYPES.map((f) => ({ value: f, label: f }))} value={feeType}
                onChange={(e) => { setFeeType(e.target.value); setSelectedMonths([]) }} placeholder="Select Fee Type" />
              <Input label="Amount (BDT)" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            {feeType === 'Tuition Fee' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Select Months</label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}>Select All</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => setSelectedMonths([])}>Clear</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MONTH_NAMES.map((name, i) => (
                    <label key={i} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${selectedMonths.includes(i + 1) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                      <input type="checkbox" className="sr-only" checked={selectedMonths.includes(i + 1)} onChange={() => toggleMonth(i + 1)} />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {feeType === 'Other Academic Charges' && (
              <Textarea label="Note (optional)" placeholder="Describe the charge" value={note} onChange={(e) => setNote(e.target.value)} />
            )}

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleAddFee} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Fee'}
              </Button>
              <Button variant="outline" onClick={resetAddForm}>Reset</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'waiver' && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-gray-900">Apply Waiver</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input label="Student ID" placeholder="Enter Student ID" value={waiverStudentId} onChange={(e) => { setWaiverStudentId(e.target.value); setWaiverStudentData(null) }} />
              </div>
              <Button variant="secondary" onClick={handleWaiverSearch} disabled={waiverSearchLoading || !waiverStudentId}>
                {waiverSearchLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {waiverSearchError && <p className="text-sm text-red-600">{waiverSearchError}</p>}
            {waiverStudentData && (
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{waiverStudentData.student.name} ({waiverStudentData.student.student_id})</p>
                  <span className="text-sm text-gray-500">Class: {waiverStudentData.student.class}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <div className="rounded bg-blue-50 p-2"><p className="font-bold text-blue-700">{Number(waiverStudentData.summary.total_due).toLocaleString()}</p><p className="text-xs text-gray-500">Total Due</p></div>
                  <div className="rounded bg-green-50 p-2"><p className="font-bold text-green-700">{Number(waiverStudentData.summary.total_paid).toLocaleString()}</p><p className="text-xs text-gray-500">Paid</p></div>
                  <div className="rounded bg-purple-50 p-2"><p className="font-bold text-purple-700">{Number(waiverStudentData.summary.total_waiver).toLocaleString()}</p><p className="text-xs text-gray-500">Waiver</p></div>
                  <div className="rounded bg-red-50 p-2"><p className="font-bold text-red-700">{Number(waiverStudentData.summary.total_outstanding).toLocaleString()}</p><p className="text-xs text-gray-500">Outstanding</p></div>
                </div>
                {waiverStudentData.records.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b text-left text-gray-500"><th className="pb-1 pr-2">Year</th><th className="pb-1 pr-2">Month</th><th className="pb-1 pr-2">Due</th><th className="pb-1 pr-2">Paid</th><th className="pb-1 pr-2">Waiver</th><th className="pb-1">Outstanding</th></tr></thead>
                      <tbody>
                        {waiverStudentData.records.map((r: any) => (
                          <tr key={r.id} className="border-b border-gray-100">
                            <td className="py-1 pr-2">{r.year}</td>
                            <td className="py-1 pr-2">{r.month || '-'}</td>
                            <td className="py-1 pr-2">{Number(r.amount_due).toLocaleString()}</td>
                            <td className="py-1 pr-2">{Number(r.amount_paid).toLocaleString()}</td>
                            <td className="py-1 pr-2">{Number(r.waiver_amount).toLocaleString()}</td>
                            <td className="py-1">{Number(r.outstanding).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  <Input label="Waiver Amount (BDT)" type="number" placeholder="0.00" value={waiverAmount} onChange={(e) => setWaiverAmount(e.target.value)} />
                  <Textarea label="Reason (optional)" placeholder="Reason for waiver" value={waiverReason} onChange={(e) => setWaiverReason(e.target.value)} />
                  <div className="flex gap-3">
                    <Button variant="primary" onClick={handleWaiver} disabled={waiverSubmitting}>
                      {waiverSubmitting ? 'Applying...' : 'Apply Waiver'}
                    </Button>
                    <Button variant="outline" onClick={() => { setWaiverStudentId(''); setWaiverStudentData(null); setWaiverAmount(''); setWaiverReason('') }}>Reset</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
