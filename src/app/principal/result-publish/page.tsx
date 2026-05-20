'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'

export default function PrincipalResultPublishPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/principal/results/publish')
      .then((r: any) => setDepartments(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'name', label: 'Name' },
    { key: 'total_mark', label: 'Total Mark' },
    { key: 'gpa', label: 'GPA' },
    { key: 'status', label: 'Status' },
  ]

  const handlePublish = async (examName: string, deptName: string) => {
    try {
      await api.post('/principal/results/publish', { exam_name: examName, department: deptName })
      alert('Results published')
      const r: any = await api.get('/principal/results/publish')
      setDepartments(r.data || [])
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBack = async (examName: string, deptName: string) => {
    const subject = prompt('Enter subject to send back:')
    if (!subject) return
    try {
      await api.post('/principal/results/back-to-exam-controller', { exam_name: examName, subject })
      alert('Results returned to Exam Controller')
      const r: any = await api.get('/principal/results/publish')
      setDepartments(r.data || [])
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
          const status = dept.results?.some((r: any) => r.status === 'approved') ? 'Approved' : 'Pending'
          return (
            <Card key={dept.department} className="mb-6">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{dept.department}</h3>
                  <Badge variant={status === 'Approved' ? 'info' : 'warning'}>{status}</Badge>
                </div>
                <DataTable columns={columns} data={dept.results || []} emptyMessage="No results ready for this department" />
                {dept.results && dept.results.length > 0 && (
                  <div className="mt-4 flex gap-3">
                    <Button variant="primary" onClick={() => handlePublish(dept.results[0]?.exam_name || '', dept.department)}>Publish Result</Button>
                    <Button variant="outline" onClick={() => handleBack(dept.results[0]?.exam_name || '', dept.department)}>Back to Exam Controller</Button>
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
