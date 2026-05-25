'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

interface LeaveApp {
  id: number
  applicant_id: number
  applicant_role: string
  applicant_name: string
  leave_type: string
  from_date: string
  to_date: string
  reason: string
  status: string
  created_at: string
  allocated: number
  taken: number
  remaining: number
}

export default function AdminLeaveManagementPage() {
  const [applications, setApplications] = useState<LeaveApp[]>([])
  const [editApp, setEditApp] = useState<LeaveApp | null>(null)
  const [editLeaveType, setEditLeaveType] = useState('')
  const [editFromDate, setEditFromDate] = useState('')
  const [editToDate, setEditToDate] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchApplications = () => {
    api.get<{ status: number; data: LeaveApp[] }>('/admin/leave-management')
      .then((res) => setApplications(res.data))
      .catch(() => {})
  }

  useEffect(() => { fetchApplications() }, [])

  const handleAction = async (id: number, action: 'approved' | 'rejected') => {
    const reason = action === 'rejected' ? prompt('Reason for rejection:') || '' : ''
    try {
      await api.post('/admin/leave-management/action', { application_id: id, action, reason })
      fetchApplications()
    } catch { alert('Action failed') }
  }

  const openEdit = (app: LeaveApp) => {
    setEditApp(app)
    setEditLeaveType(app.leave_type)
    setEditFromDate(app.from_date)
    setEditToDate(app.to_date)
    setEditReason(app.reason || '')
    setEditStatus(app.status)
  }

  const closeEdit = () => {
    setEditApp(null)
  }

  const handleSaveEdit = async () => {
    if (!editApp) return
    setSaving(true)
    try {
      await api.put(`/admin/leave-management/${editApp.id}`, {
        leave_type: editLeaveType,
        from_date: editFromDate,
        to_date: editToDate,
        reason: editReason,
        status: editStatus,
      })
      closeEdit()
      fetchApplications()
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

  const columns = [
    { key: 'sl', label: 'SL No' },
    { key: 'applicant_name', label: 'Applicant' },
    { key: 'applicant_role', label: 'Role' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'date_range', label: 'Date Range' },
    { key: 'allocated', label: 'Allocated' },
    { key: 'taken', label: 'Taken' },
    { key: 'remaining', label: 'Remaining' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = applications.map((a, i) => ({
    sl: i + 1,
    applicant_name: a.applicant_name,
    applicant_role: a.applicant_role,
    leave_type: a.leave_type,
    date_range: `${a.from_date} - ${a.to_date}`,
    allocated: a.allocated,
    taken: a.taken,
    remaining: a.remaining,
    status: statusBadge(a.status),
    actions: (
      <div className="flex gap-2">
        {a.status === 'pending' && (
          <>
            <Button variant="primary" size="sm" onClick={() => handleAction(a.id, 'approved')}>Approve</Button>
            <Button variant="danger" size="sm" onClick={() => handleAction(a.id, 'rejected')}>Reject</Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="admin" title="Leave Management">
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} emptyMessage="No leave applications" />
        </CardContent>
      </Card>

      {editApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Leave Application</h3>
              <p className="text-sm text-gray-500">
                Applicant: {editApp.applicant_name} ({editApp.applicant_role})
              </p>

              <Select label="Leave Type" value={editLeaveType} onChange={(e) => setEditLeaveType(e.target.value)}
                options={[
                  { value: 'casual', label: 'Casual Leave' },
                  { value: 'medical', label: 'Medical Leave' },
                  { value: 'maternity', label: 'Maternity Leave' },
                  { value: 'without_pay', label: 'Without Pay Leave' },
                ]} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="From Date" type="date" value={editFromDate} onChange={(e) => setEditFromDate(e.target.value)} />
                <Input label="To Date" type="date" value={editToDate} onChange={(e) => setEditToDate(e.target.value)} />
              </div>

              <Input label="Reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} />

              <Select label="Status" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]} />

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
