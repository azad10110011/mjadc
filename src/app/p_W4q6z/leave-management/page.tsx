'use client'

import { useState, useEffect, useMemo } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

export default function PrincipalLeaveManagementPage() {
  const { user } = useAuth()
  const isFemale = user?.gender === 'female'
  const leaveTypeOptions = [
    { value: 'casual', label: 'Casual Leave' },
    { value: 'medical', label: 'Medical Leave' },
    ...(isFemale ? [{ value: 'maternity', label: 'Maternity Leave' }] : []),
    { value: 'without_pay', label: 'Without Pay Leave' },
  ]

  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [leaveType, setLeaveType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editApp, setEditApp] = useState<any>(null)
  const [editLeaveType, setEditLeaveType] = useState('')
  const [editFromDate, setEditFromDate] = useState('')
  const [editToDate, setEditToDate] = useState('')
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)

  const summaryColumns = [
    { key: 'type', label: 'Leave Type' },
    { key: 'allocated', label: 'Total Allocated' },
    { key: 'taken', label: 'Leave Taken' },
    { key: 'remaining', label: 'Leave Remaining' },
    { key: 'period', label: 'Period' },
  ]

  const pendingColumns = [
    { key: 'sl', label: 'SL No' },
    { key: 'applicant_name', label: 'Applicant Name' },
    { key: 'applicant_role', label: 'Role' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'date_range', label: 'Date Range' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const handleApply = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) return
    setSubmitting(true)
    try {
      await api.post('/principal/leave/apply', {
        leave_type: leaveType, from_date: fromDate, to_date: toDate, reason,
      })
      alert('Leave application submitted')
      setShowForm(false)
      setLeaveType(''); setFromDate(''); setToDate(''); setReason('')
      const r: any = await api.get('/principal/leave/summary')
      setSummary(r.data || [])
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }

  const handleAction = async (id: number, action: string) => {
    try {
      await api.post('/principal/leave/action', { application_id: id, action })
      alert(`Leave ${action}`)
      const r: any = await api.get('/principal/leave/pending')
      setPending(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const pendingTableData = pending.map((app: any, i: number) => ({
    sl: i + 1,
    applicant_name: app.applicant_name,
    applicant_role: app.applicant_role,
    leave_type: app.leave_type,
    date_range: `${app.from_date} to ${app.to_date}`,
    status: <Badge variant="warning">{app.status}</Badge>,
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => handleAction(app.id, 'approved')}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleAction(app.id, 'rejected')}>Reject</Button>
      </div>
    ),
  }))

  const LEAVE_ORDER: Record<string, number> = { casual: 0, medical: 1, maternity: 2, without_pay: 3 }

  const sortedSummary = useMemo(() =>
    summary
      .filter((l: any) => l.type !== 'maternity' || isFemale)
      .sort((a: any, b: any) => (LEAVE_ORDER[a.type] ?? 99) - (LEAVE_ORDER[b.type] ?? 99)),
    [summary, isFemale]
  )

  // Principal's own applications - fetched separately if needed
  const [myApplications, setMyApplications] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      api.get('/principal/leave/summary').then((r: any) => setSummary(r.data || [])).catch(() => {}),
      api.get('/principal/leave/pending').then((r: any) => setPending(r.data || [])).catch(() => {}),
      api.get('/principal/leave/applications').then((r: any) => setMyApplications(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const openEdit = (app: any) => {
    setEditApp(app)
    setEditLeaveType(app.leave_type)
    setEditFromDate(app.from_date)
    setEditToDate(app.to_date)
    setEditReason(app.reason || '')
  }

  const closeEdit = () => {
    setEditApp(null)
  }

  const handleSaveEdit = async () => {
    if (!editApp) return
    setSaving(true)
    try {
      await api.put(`/principal/leave/${editApp.id}`, {
        leave_type: editLeaveType,
        from_date: editFromDate,
        to_date: editToDate,
        reason: editReason,
      })
      closeEdit()
      const r: any = await api.get('/teacher/leave/applications')
      setMyApplications(r.data || [])
    } catch (e: any) {
      alert(e.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }
    return <Badge variant={(map[status] || 'default') as 'success' | 'warning' | 'danger' | 'info' | 'default'}>{status}</Badge>
  }

  return (
    <PanelLayout role="principal" title="Leave Management">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">My Leave Summary</h3>
            <Button onClick={() => setShowForm(!showForm)}>New Leave Application</Button>
          </div>
          <DataTable columns={summaryColumns} data={sortedSummary.map((s: any) => ({ ...s, period: s.period === 'lifetime' ? 'Lifetime' : 'Yearly' }))} loading={loading} />
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-gray-900">New Leave Application</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Leave Type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                options={leaveTypeOptions} placeholder="Select" />
              <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleApply} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Pending Leave Approvals</h3>
          <DataTable columns={pendingColumns} data={pendingTableData} emptyMessage="No pending approvals" loading={loading} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">My Applications</h3>
          <DataTable
            columns={[
              { key: 'leave_type', label: 'Leave Type' },
              { key: 'from_date', label: 'From' },
              { key: 'to_date', label: 'To' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={myApplications.map((a: any) => ({
              leave_type: a.leave_type,
              from_date: a.from_date,
              to_date: a.to_date,
              status: statusBadge(a.status),
              actions: a.status === 'pending' ? (
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
              ) : null,
            }))}
            emptyMessage="No applications yet"
          />
        </CardContent>
      </Card>

      {editApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Leave Application</h3>

              <Select label="Leave Type" value={editLeaveType} onChange={(e) => setEditLeaveType(e.target.value)}
                options={leaveTypeOptions} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="From Date" type="date" value={editFromDate} onChange={(e) => setEditFromDate(e.target.value)} />
                <Input label="To Date" type="date" value={editToDate} onChange={(e) => setEditToDate(e.target.value)} />
              </div>

              <Input label="Reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} />

              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="ghost" onClick={closeEdit}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PanelLayout>
  )
}
