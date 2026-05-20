'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

export default function PrincipalLeaveManagementPage() {
  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [leaveType, setLeaveType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/principal/leave/summary').then((r: any) => setSummary(r.data || [])).catch(() => {}),
      api.get('/principal/leave/pending').then((r: any) => setPending(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const summaryColumns = [
    { key: 'type', label: 'Leave Type' },
    { key: 'allocated', label: 'Total Allocated' },
    { key: 'taken', label: 'Leave Taken' },
    { key: 'remaining', label: 'Leave Remaining' },
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

  return (
    <PanelLayout role="principal" title="Leave Management">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">My Leave Summary</h3>
            <Button onClick={() => setShowForm(!showForm)}>New Leave Application</Button>
          </div>
          <DataTable columns={summaryColumns} data={summary} loading={loading} />
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-semibold text-gray-900">New Leave Application</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Leave Type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'medical', label: 'Medical Leave' },
                  { value: 'without_pay', label: 'Without Pay Leave' },
                ]} placeholder="Select" />
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
    </PanelLayout>
  )
}
