'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

export default function PrincipalResultPublishPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setLoading(true)
    api.get('/principal/results/publish')
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
      await api.post('/principal/results/publish', { exam_name: examName, class: cls, group })
      alert('Results published')
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBack = async (examName: string) => {
    const subject = prompt('Enter subject name to send back to Exam Controller:')
    if (!subject) return
    try {
      await api.post('/principal/results/back-to-exam-controller', { exam_name: examName, subject })
      alert('Results returned to Exam Controller for revision')
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <PanelLayout role="principal" title="Result Publish">
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
                  <div className="mt-4 flex gap-3">
                    <Button variant="primary" onClick={() => handlePublish(dept.exam_name, dept.class, dept.department)}>Publish {dept.department}</Button>
                    <Button variant="outline" onClick={() => handleBack(dept.exam_name)}>Back to Exam Controller</Button>
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
