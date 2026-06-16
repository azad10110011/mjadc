'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

export default function AdminPublishResultPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    setLoading(true)
    api.get('/admin/results/publish-data')
      .then((r: any) => setDepartments(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'name', label: 'Name' },
    { key: 'gpa', label: 'GPA' },
    { key: 'fail_count', label: 'Fail Subjects' },
    { key: 'status', label: 'Status' },
  ]

  const handlePublish = async (examName: string, cls: string, group: string) => {
    if (!confirm(`Publish results for ${group}?`)) return
    try {
      await api.post('/admin/results/publish', { exam_name: examName, class: cls, group })
      alert('Results published!')
      loadData()
    } catch (e: any) { alert(e.message) }
  }

  const handleBackToExamController = async (examName: string, subject: string, cls: string) => {
    if (!confirm(`Send ${subject} results back to Exam Controller for ${cls}?`)) return
    try {
      await api.post('/admin/results/back-to-exam-controller', { exam_name: examName, subject, class: cls })
      alert('Results returned to Exam Controller')
      loadData()
    } catch (e: any) { alert(e.message) }
  }

  const handleBackToTeacher = async (examName: string, subject: string, cls: string) => {
    if (!confirm(`Send ${subject} results back to Teacher for ${cls}?`)) return
    try {
      await api.post('/admin/results/back-to-teacher', { exam_name: examName, subject, class: cls })
      alert('Results returned to Teacher')
      loadData()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <PanelLayout role="admin" title="Publish Results">
      {loading ? (
        <Card><CardContent className="pt-6"><p className="text-center text-sm text-gray-500">Loading...</p></CardContent></Card>
      ) : departments.length === 0 ? (
        <Card><CardContent className="pt-6"><p className="text-center text-sm text-gray-500">No results ready for publishing</p></CardContent></Card>
      ) : (
        departments.map((dept: any) => {
          const hasApproved = dept.results?.some((r: any) => r.status === 'approved')
          return (
            <Card key={dept.department} className="mb-6">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{dept.department}</h3>
                  <Badge variant={hasApproved ? 'info' : 'warning'}>{hasApproved ? 'Approved' : 'Pending'}</Badge>
                </div>
                <DataTable columns={columns} data={(dept.results || []).map((r: any) => ({
                  ...r,
                  status: <Badge variant={r.status === 'approved' ? 'info' : 'warning'}>{r.status}</Badge>,
                }))} emptyMessage="No results ready for this department" />
                {hasApproved && (
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <Button variant="primary" onClick={() => handlePublish(dept.exam_name, dept.class, dept.department)}>
                      Publish {dept.department}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const subject = prompt('Enter subject name to send back to Exam Controller:')
                      if (subject) handleBackToExamController(dept.exam_name, subject, dept.class)
                    }}>
                      Back to Exam Controller
                    </Button>
                    <Button variant="secondary" onClick={() => {
                      const subject = prompt('Enter subject name to send back to Teacher:')
                      if (subject) handleBackToTeacher(dept.exam_name, subject, dept.class)
                    }}>
                      Back to Teacher
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </PanelLayout>
  )
}
