'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

export default function ExamControllerApproveResultPage() {
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])

  const columns = [
    { key: 'exam_name', label: 'Exam Name' },
    { key: 'subject', label: 'Subject' },
    { key: 'class', label: 'Class' },
    { key: 'student_count', label: 'Students' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  useEffect(() => {
    api.get('/exam-controller/results/pending')
      .then((r: any) => setPending(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleApproveSingle = async (id: number) => {
    try {
      await api.post(`/exam-controller/results/approve/${id}`, {})
      alert('Result approved')
      const r: any = await api.get('/exam-controller/results/pending')
      setPending(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleApproveBatch = async (exam_name: string, subject: string, cls: string) => {
    try {
      await api.post('/exam-controller/results/approve-batch', { exam_name, subject, class: cls })
      alert('Batch approved')
      const r: any = await api.get('/exam-controller/results/pending')
      setPending(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const tableData = pending.map((r: any) => ({
    exam_name: r.exam_name,
    subject: r.subject,
    class: r.class,
    student_count: r.student_count,
    status: <Badge variant="warning">{r.status}</Badge>,
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => handleApproveSingle(r.result_group_id)}>Approve</Button>
        <Button size="sm" variant="outline" onClick={() => handleApproveBatch(r.exam_name, r.subject, r.class)}>Approve All</Button>
      </div>
    ),
  }))

  return (
    <PanelLayout role="exam_controller" title="Approve Result">
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={tableData} emptyMessage="No pending results for approval" loading={loading} />
        </CardContent>
      </Card>
    </PanelLayout>
  )
}
