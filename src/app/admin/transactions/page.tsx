'use client'

import { useState, useEffect, useCallback } from 'react'
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

const PAYMENT_METHODS = [
  { value: '', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online' },
]

interface Payment {
  id: number
  transaction_id: string
  amount: number
  payment_type: string
  fee_type: string
  payment_method: string
  month_paid: number
  year_paid: number
  status: string
  collected_by: string
  created_at: string
  student_id: string
  student_name: string
  student_class: string
}

interface ModalData {
  id?: number
  student_id: string
  amount: string
  fee_type: string
  payment_method: string
  month_paid: string
  year_paid: string
  collected_by: string
}

const emptyModal: ModalData = {
  student_id: '',
  amount: '',
  fee_type: 'Tuition Fee',
  payment_method: 'cash',
  month_paid: String(new Date().getMonth() + 1),
  year_paid: String(new Date().getFullYear()),
  collected_by: 'Admin',
}

export default function AdminTransactionsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [filterStudentId, setFilterStudentId] = useState('')
  const [filterFeeType, setFilterFeeType] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<ModalData>(emptyModal)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchPayments = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (filterStudentId) params.set('student_id', filterStudentId)
    if (filterFeeType) params.set('fee_type', filterFeeType)
    if (filterPaymentMethod) params.set('payment_method', filterPaymentMethod)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)

    api.get<{ status: number; data: { payments: Payment[]; total: number; total_pages: number; total_amount: number } }>(`/admin/transactions?${params}`)
      .then((res) => {
        setPayments(res.data.payments)
        setTotal(res.data.total)
        setTotalPages(res.data.total_pages)
        setTotalAmount(res.data.total_amount)
      })
      .catch((e: Error) => alert(e.message))
      .finally(() => setLoading(false))
  }, [page, filterStudentId, filterFeeType, filterPaymentMethod, filterFrom, filterTo])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const openAdd = () => {
    setEditingId(null)
    setModalData(emptyModal)
    setModalOpen(true)
  }

  const openEdit = (p: Payment) => {
    setEditingId(p.id)
    setModalData({
      id: p.id,
      student_id: p.student_id,
      amount: String(p.amount),
      fee_type: p.fee_type,
      payment_method: p.payment_method,
      month_paid: String(p.month_paid),
      year_paid: String(p.year_paid),
      collected_by: p.collected_by || 'Admin',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!modalData.student_id || !modalData.amount) { alert('Student ID and amount are required'); return }
    setSaving(true)
    try {
      const payload = {
        student_id: modalData.student_id,
        amount: Number(modalData.amount),
        fee_type: modalData.fee_type,
        payment_method: modalData.payment_method,
        month_paid: Number(modalData.month_paid),
        year_paid: Number(modalData.year_paid),
        collected_by: modalData.collected_by,
      }
      if (editingId) {
        await api.put(`/admin/transactions/${editingId}`, payload)
      } else {
        await api.post('/admin/transactions', payload)
      }
      setModalOpen(false)
      fetchPayments()
    } catch (e: any) {
      alert(e.message)
    }
    setSaving(false)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this transaction? This will also adjust the student fee balance.')) return
    api.delete(`/admin/transactions/${id}`)
      .then(() => fetchPayments())
      .catch((e: Error) => alert(e.message))
  }

  const handleSearch = () => { setPage(1); fetchPayments() }

  const columns = [
    { key: 'transaction_id', label: 'Transaction ID' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'student_name', label: 'Student' },
    { key: 'amount', label: 'Amount' },
    { key: 'fee_type', label: 'Fee Type' },
    { key: 'payment_method', label: 'Method' },
    { key: 'collected_by', label: 'Collected By' },
    { key: 'date', label: 'Date' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = payments.map((p) => ({
    ...p,
    amount: Number(p.amount).toLocaleString(),
    date: p.created_at ? new Date(p.created_at).toLocaleString() : '-',
    actions: (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>Edit</Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Transactions">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <Button variant="primary" onClick={openAdd}>+ Add Transaction</Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Student ID" value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)} />
            <Select label="Fee Type" options={[{ value: '', label: 'All' }, ...FEE_TYPES.map((f) => ({ value: f, label: f }))]} value={filterFeeType} onChange={(e) => setFilterFeeType(e.target.value)} />
            <Select label="Method" options={PAYMENT_METHODS} value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} />
            <Input label="From" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            <Input label="To" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            <Button onClick={handleSearch} disabled={loading}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          {total} transaction(s) — Total: {totalAmount.toLocaleString()} BDT
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} loading={loading} emptyMessage="No transactions found" />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !saving && setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h3>
            <div className="space-y-4">
              <Input label="Student ID" value={modalData.student_id} onChange={(e) => setModalData((prev) => ({ ...prev, student_id: e.target.value }))} disabled={!!editingId} />
              <Input label="Amount (BDT)" type="number" value={modalData.amount} onChange={(e) => setModalData((prev) => ({ ...prev, amount: e.target.value }))} />
              <Select label="Fee Type" options={FEE_TYPES.map((f) => ({ value: f, label: f }))} value={modalData.fee_type} onChange={(e) => setModalData((prev) => ({ ...prev, fee_type: e.target.value }))} />
              <Select label="Payment Method" options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]} value={modalData.payment_method} onChange={(e) => setModalData((prev) => ({ ...prev, payment_method: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Month" options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('en', { month: 'long' }) }))} value={modalData.month_paid} onChange={(e) => setModalData((prev) => ({ ...prev, month_paid: e.target.value }))} />
                <Select label="Year" options={Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))} value={modalData.year_paid} onChange={(e) => setModalData((prev) => ({ ...prev, year_paid: e.target.value }))} />
              </div>
              <Input label="Collected By" value={modalData.collected_by} onChange={(e) => setModalData((prev) => ({ ...prev, collected_by: e.target.value }))} />
            </div>
            <div className="mt-6 flex items-center gap-2">
              <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
              <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  )
}
