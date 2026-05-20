'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { Search } from 'lucide-react'
import { api, UPLOAD_BASE } from '@/lib/api'

const FEE_TYPES = [
  'Tuition Fee',
  'Exam Fee',
  'Testimonial Fee',
  'Registration Fee',
  'Practical Fee',
  'Other Academic Charges',
]

export default function AdminFeeCollectionPage() {
  const [studentId, setStudentId] = useState('')
  const [student, setStudent] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [feeType, setFeeType] = useState('Tuition Fee')

  const [amount, setAmount] = useState('')
  const [collecting, setCollecting] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)

  const handleSearch = async () => {
    if (!studentId) return
    setSearching(true)
    setReceipt(null)
    try {
      const r: any = await api.get(`/admin-panel/fees/search?student_id=${encodeURIComponent(studentId)}`)
      setStudent(r.data || null)
      fetchPaymentHistory()
    } catch (e: any) {
      alert(e.message)
      setStudent(null)
    } finally { setSearching(false) }
  }

  const fetchPaymentHistory = async () => {
    try {
      const r: any = await api.get(`/admin-panel/fees/history?student_id=${encodeURIComponent(studentId)}`)
      setPaymentHistory(r.data || [])
    } catch {
      setPaymentHistory([])
    }
  }

  const handleCollect = async () => {
    if (!studentId || !amount) return
    setCollecting(true)
    try {
      const r: any = await api.post('/admin-panel/fees/collect', {
        student_id: studentId,
        amount: Number(amount),
        fee_type: feeType,
      })
      setReceipt(r.data)
      alert('Payment recorded successfully')
      setAmount('')
      fetchPaymentHistory()
      handleSearch()
    } catch (e: any) {
      alert(e.message)
    } finally { setCollecting(false) }
  }

  const historyColumns = [
    { key: 'transaction_id', label: 'Transaction ID' },
    { key: 'amount', label: 'Amount (BDT)' },
    { key: 'collected_by', label: 'Collected By' },
    { key: 'paid_at', label: 'Date' },
  ]

  const historyRows = paymentHistory.map((p: any) => ({
    transaction_id: p.transaction_id || '-',
    amount: p.amount,
    collected_by: p.collected_by || '-',
    paid_at: p.created_at ? new Date(p.created_at).toLocaleString() : '-',
  }))

  return (
    <PanelLayout role="administration" title="Fee Collection">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Record Cash Payment</h3>
          <div className="flex gap-3">
            <Input placeholder="Enter Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>

          {!student && !receipt && (
            <div className="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
              Search for a student to record a cash fee payment.
            </div>
          )}

          {student && !receipt && (
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                {student.photo_path && (
                  <img src={`${UPLOAD_BASE}/${student.photo_path}`} alt="" className="h-12 w-12 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-xs text-gray-500">ID: {student.student_id} | Class: {student.class} | Group: {student.student_group || '-'}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="rounded-lg bg-red-50 px-3 py-1 text-red-700">Unpaid: {student.unpaid} BDT</span>
                <span className="rounded-lg bg-green-50 px-3 py-1 text-green-700">Paid: {student.total_paid} BDT</span>
              </div>
              <div className="sm:w-64">
                <Select label="Fee Type" options={FEE_TYPES.map((f) => ({ value: f, label: f }))} value={feeType} onChange={(e) => setFeeType(e.target.value)} />
              </div>
              <div className="sm:w-64">
                <Input label="Amount (BDT)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <Button onClick={handleCollect} disabled={collecting || !amount}>
                {collecting ? 'Processing...' : 'Collect Payment'}
              </Button>
            </div>
          )}

          {receipt && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-medium">Payment Successful</p>
              <p>Transaction ID: {receipt.transaction_id}</p>
              <p>{receipt.receipt}</p>
            </div>
          )}

          {paymentHistory.length > 0 && (
            <div className="pt-2">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Payment History</h4>
              <DataTable columns={historyColumns} data={historyRows} emptyMessage="No payment history" />
            </div>
          )}
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
