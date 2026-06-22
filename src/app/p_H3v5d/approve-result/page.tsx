'use client'

import { useState, useEffect, useRef } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, DataTable, Badge, Modal } from '@/components/ui'
import { api } from '@/lib/api'
import { Printer, Eye } from 'lucide-react'

export default function ExamControllerApproveResultPage() {
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<any[]>([])
  const [detailTitle, setDetailTitle] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const columns = [
    { key: 'exam_name', label: 'Exam Name' },
    { key: 'subject', label: 'Subject' },
    { key: 'class', label: 'Class' },
    { key: 'student_count', label: 'Students' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ]

  const detailColumns = [
    { key: 'sl', label: 'SL No' },
    { key: 'student_id', label: 'Roll' },
    { key: 'name', label: 'Name' },
    { key: 'mcq', label: 'MCQ' },
    { key: 'cq', label: 'CQ' },
    { key: 'practical', label: 'Practical' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
  ]

  useEffect(() => {
    api.get('/exam-controller/results/pending')
      .then((r: any) => setPending(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleView = async (exam_name: string, subject: string, cls: string) => {
    setDetailTitle(`${exam_name} - ${subject} (${cls})`)
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const r: any = await api.get(`/exam-controller/results/detail?exam_name=${encodeURIComponent(exam_name)}&subject=${encodeURIComponent(subject)}&class=${encodeURIComponent(cls)}`)
      setDetailData((r.data || []).map((s: any, i: number) => ({
        ...s,
        sl: i + 1,
        mcq: s.mcq ?? 0,
        cq: s.cq ?? 0,
        practical: s.practical ?? 0,
        total: s.total ?? 0,
        gpa: Number(s.gpa ?? 0).toFixed(2),
      })))
    } catch {
      setDetailData([])
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>${detailTitle}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; padding: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid black; padding: 4px 6px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; }
        .left { text-align: left; }
      </style></head><body>
      <h2>${detailTitle}</h2>
      <table>
        <thead><tr>
          <th>SL No</th><th>Roll</th><th class="left">Name</th><th>MCQ</th><th>CQ</th><th>Practical</th><th>Total</th><th>Grade</th><th>GPA</th>
        </tr></thead>
        <tbody>
          ${detailData.map((s: any) => `
            <tr>
              <td>${s.sl}</td>
              <td>${s.student_id}</td>
              <td class="left">${s.name}</td>
              <td>${s.mcq}</td>
              <td>${s.cq}</td>
              <td>${s.practical}</td>
              <td>${s.total}</td>
              <td>${s.grade}</td>
              <td>${s.gpa}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const handleApprove = async (exam_name: string, subject: string, cls: string) => {
    try {
      await api.post('/exam-controller/results/approve-batch', { exam_name, subject, class: cls })
      alert('Results approved')
      const r: any = await api.get('/exam-controller/results/pending')
      setPending(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBackToTeacher = async (exam_name: string, subject: string, cls: string) => {
    if (!confirm(`Send all ${subject} results back to teacher for ${cls}?`)) return
    try {
      await api.post('/exam-controller/results/back-to-teacher', { exam_name, subject, class: cls })
      alert('Results returned to teacher')
      const r: any = await api.get('/exam-controller/results/pending')
      setPending(r.data || [])
    } catch (e: any) { alert(e.message) }
  }

  const tableData = pending.map((r: any) => {
    const isApproved = r.status === 'approved'
    return {
      exam_name: r.exam_name,
      subject: r.subject,
      class: r.class,
      student_count: r.student_count,
      status: <Badge variant={r.status === 'submitted' ? 'info' : isApproved ? 'success' : 'warning'}>{r.status}</Badge>,
      actions: (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleView(r.exam_name, r.subject, r.class)}><Eye className="h-3.5 w-3.5" /></Button>
          {!isApproved && (
            <Button size="sm" variant="primary" onClick={() => handleApprove(r.exam_name, r.subject, r.class)}>Approve</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => handleBackToTeacher(r.exam_name, r.subject, r.class)}>Back to Teacher</Button>
        </div>
      ),
    }
  })

  return (
    <PanelLayout role="exam_controller" title="Approve Result">
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={tableData} emptyMessage="No pending results for approval" loading={loading} />
        </CardContent>
      </Card>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detailTitle}>
        <div ref={printRef}>
          <div className="mb-3 flex justify-end">
            <Button size="sm" variant="secondary" onClick={handlePrint}><Printer className="mr-1 h-4 w-4" /> Print</Button>
          </div>
          <DataTable columns={detailColumns} data={detailData} loading={detailLoading} emptyMessage="No data found" />
        </div>
      </Modal>
    </PanelLayout>
  )
}
