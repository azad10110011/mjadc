'use client'

import { useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function AdminResultsPage() {
  const [year, setYear] = useState('')
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []
  const classes = [{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]

  const handleSearch = async () => {
    if (!year || !cls || !examName || !studentId.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.get<any>(`/admin-panel/results?year=${encodeURIComponent(year)}&class=${encodeURIComponent(cls)}&exam_name=${encodeURIComponent(examName)}&student_id=${encodeURIComponent(studentId.trim())}`)
      setResult(res.data || null)
    } catch { setResult(null) }
    setLoading(false)
  }

  const columns = [
    { key: 'subject', label: 'Subject' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
  ]

  return (
    <PanelLayout role="administration" title="Results">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-semibold text-gray-900">Search Published Results</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            <Select label="Year" options={years} placeholder="Select year" value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={classes} placeholder="Select class" value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} />
            <Select label="Exam Name" options={examOptions} placeholder="Select exam" value={examName} onChange={(e) => setExamName(e.target.value)} />
            <Input label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Enter student ID" />
          </div>
          <Button variant="primary" onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
          {searched && (
            <div>
              {result ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Student ID:</span> <span className="font-medium">{result.student_id}</span></div>
                    <div><span className="text-gray-500">Name:</span> <span className="font-medium">{result.name}</span></div>
                  </div>
                  <div className="flex items-center gap-4">
                    {result.status === 'Passed' ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold">PASSED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-bold">FAILED</span>
                      </div>
                    )}
                    {result.status === 'Passed' && (
                      <span className="font-semibold">Final GPA: <span className="text-blue-600">{result.final_gpa}</span></span>
                    )}
                  </div>
                  {result.fail_subjects?.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="font-medium text-red-700 mb-1">Failed Subjects:</p>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {result.fail_subjects.map((s: string) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  <DataTable columns={columns} data={(result.subjects || []).map((s: any) => ({
                    subject: s.subject,
                    grade: <span className={`font-medium ${s.grade === 'F' || s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.grade}</span>,
                    gpa: <span className={`font-medium ${s.gpa === 0 ? 'text-red-600' : ''}`}>{s.gpa}</span>,
                  }))} emptyMessage="No subject data" />
                </div>
              ) : (
                <p className="text-sm text-gray-500">No published results found for this student.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PanelLayout>
  )
}