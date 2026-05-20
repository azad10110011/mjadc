'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'

export default function StaffLeaveManagementPage() {
  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [leaveType, setLeaveType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/staff/leave/summary').then((r: any) => setSummary(r.data || [])).catch(() => {}),
      api.get('/staff/leave/applications').then((r: any) => setApplications(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const summaryColumns = [
    { key: 'type', label: 'Leave Type' },
    { key: 'allocated', label: 'Total Allocated' },
    { key: 'taken', label: 'Leave Taken' },
    { key: 'remaining', label: 'Leave Remaining' },
  ]

  const appColumns = [
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'from_date', label: 'From' },
    { key: 'to_date', label: 'To' },
    { key: 'status', label: 'Status' },
  ]

  const handleSubmit = async () => {
    if (!leaveType || !fromDate || !toDate || !reason) return
    setSubmitting(true)
    try {
      await api.post('/staff/leave/apply', {
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason,
      })
      alert('Leave application submitted')
      setShowForm(false)
      setLeaveType('')
      setFromDate('')
      setToDate('')
      setReason('')
      const r: any = await api.get('/staff/leave/applications')
      setApplications(r.data || [])
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PanelLayout role="staff" title="Leave Management">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Leave Summary</h3>
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
            <Input label="Supporting Document" type="file" accept=".pdf,.jpg,.png" />
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 font-semibold text-gray-900">Application History</h3>
          <DataTable columns={appColumns} data={applications} emptyMessage="No applications yet" loading={loading} />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
