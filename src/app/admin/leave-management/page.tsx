'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

interface LeaveApp {
  id: number
  applicant_name: string
  type: string
  start_date: string
  end_date: string
  status: string
  reason?: string
}

export default function AdminLeaveManagementPage() {
  const [applications, setApplications] = useState<LeaveApp[]>([])

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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }
    return <Badge variant={(map[status] || 'default') as 'success' | 'warning' | 'danger' | 'info' | 'default'}>{status}</Badge>
  }

  const columns = [
    { key: 'sl', label: 'SL No' },
    { key: 'applicant_name', label: 'Applicant' },
    { key: 'type', label: 'Leave Type' },
    { key: 'date_range', label: 'Date Range' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const rows = applications.map((a, i) => ({
    sl: i + 1,
    applicant_name: a.applicant_name,
    type: a.type,
    date_range: `${a.start_date} - ${a.end_date}`,
    status: statusBadge(a.status),
    actions: a.status === 'pending' ? (
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => handleAction(a.id, 'approved')}>Approve</Button>
        <Button variant="danger" size="sm" onClick={() => handleAction(a.id, 'rejected')}>Reject</Button>
      </div>
    ) : null,
  }))

  return (
    <PanelLayout role="admin" title="Leave Management">
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} emptyMessage="No leave applications" />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
