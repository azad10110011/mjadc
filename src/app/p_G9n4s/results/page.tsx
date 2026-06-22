'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent, DataTable, Badge } from '@/components/ui'
import { api } from '@/lib/api'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function StudentResultsPage() {
  const [examName, setExamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [exams, setExams] = useState<string[]>([])

  useEffect(() => {
    api.get<any>('/student/dashboard').then((r) => {
      const student = r.data?.student
      if (student?.class) {
        // Fetch available exams - using the student's published exam results
        api.get<any>(`/student/results${student.class ? '?class=' + student.class : ''}`).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const handleSearch = async () => {
    if (!examName) return
    setLoading(true)
    try {
      const r: any = await api.get(`/student/results?exam_name=${encodeURIComponent(examName)}`)
      setResult(r.data)
    } catch (e: any) {
      setResult(null)
      alert(e.message)
    } finally { setLoading(false) }
  }

  const subjectColumns = [
    { key: 'subject', label: 'Subject' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
  ]

  return (
    <PanelLayout role="student" title="My Results">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select label="Select Exam" value={examName} onChange={(e) => setExamName(e.target.value)}
                options={[{ value: 'Half Yearly', label: 'Half Yearly' }, { value: 'Final', label: 'Final' }, { value: 'Pre-Test', label: 'Pre-Test' }, { value: 'Test', label: 'Test' }]}
                placeholder="Choose exam" />
            </div>
            <Button onClick={handleSearch} disabled={!examName || loading}>{loading ? 'Loading...' : 'View Result'}</Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-6 flex items-center gap-4">
              {result.status === 'Passed' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-lg font-bold">PASSED</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-6 w-6" />
                  <span className="text-lg font-bold">FAILED</span>
                </div>
              )}
              {result.status === 'Passed' && (
                <div className="text-lg font-semibold text-gray-900">
                  Final GPA: <span className="text-blue-600">{Number(result.final_gpa).toFixed(2)}</span>
                </div>
              )}
            </div>

            {result.fail_subjects?.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="font-medium text-red-700 mb-1">Failed Subjects:</p>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {result.fail_subjects.map((s: string) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}

            <DataTable columns={subjectColumns} data={(result.subjects || []).map((s: any) => ({
              subject: s.subject,
              grade: <span className={`font-medium ${s.grade === 'F' || s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.grade}</span>,
              gpa: <span className={`font-medium ${Number(s.gpa) === 0 ? 'text-red-600' : ''}`}>{Number(s.gpa).toFixed(2)}</span>,
            }))} emptyMessage="No subjects found" />
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
