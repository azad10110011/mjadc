'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

interface LogEntry {
  id: number
  exam_result_id: number | null
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_id: number
  user_name: string
  user_email: string
  subject: string
  student_id: string
  exam_name: string
  class: string
  year: number
  created_at: string
}

export default function AdminUserHistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterAction) params.set('action', filterAction)
      params.set('limit', '200')
      const res: any = await api.get(`/admin/changelog?${params}`)
      setLogs(res.data || [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const actionColors: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    created: 'success',
    updated: 'warning',
    deleted: 'danger',
    approved: 'info',
    published: 'info',
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Date/Time' },
    { key: 'user', label: 'User' },
    { key: 'action', label: 'Action' },
    { key: 'exam', label: 'Exam' },
    { key: 'subject', label: 'Subject' },
    { key: 'student', label: 'Student' },
    { key: 'details', label: 'Details' },
  ]

  const rows = logs.map((l) => ({
    id: l.id,
    date: new Date(l.created_at).toLocaleString(),
    user: <span className="text-sm">{l.user_name} <span className="text-gray-400">({l.user_email})</span></span>,
    action: <Badge variant={actionColors[l.action] || 'info'}>{l.action}</Badge>,
    exam: l.exam_name ? `${l.exam_name} - ${l.class} (${l.year})` : '-',
    subject: l.subject || '-',
    student: l.student_id || '-',
    details: l.new_data ? (
      <details className="text-xs">
        <summary className="cursor-pointer text-blue-600">View</summary>
        <pre className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600 max-w-xs overflow-auto">
          {JSON.stringify(l.new_data, null, 2)}
        </pre>
      </details>
    ) : '-',
  }))

  return (
    <PanelLayout role="admin" title="User Action History">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                label="Filter by Action"
                options={[
                  { value: '', label: 'All Actions' },
                  { value: 'created', label: 'Created' },
                  { value: 'updated', label: 'Updated' },
                  { value: 'deleted', label: 'Deleted' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'published', label: 'Published' },
                ]}
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              />
            </div>
            <Button onClick={fetchLogs}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={rows} emptyMessage="No history found" loading={loading} />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
