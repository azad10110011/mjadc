'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, CheckCircle2, XCircle } from 'lucide-react'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'

interface SubjectResult {
  subject: string
  mcq: number
  cq: number
  practical: number
  total: number
  grade: string
  gpa: number
  absent_in?: string
}

interface ResultData {
  student_id: string
  name: string
  status: string
  fail_subjects: string[]
  final_gpa: number
  subjects: SubjectResult[]
}

export default function ResultsPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []
  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))

  async function handleSearch() {
    if (!year || !cls || !examName || !studentId) return
    setLoading(true)
    setError('')
    setSearched(true)
    setResult(null)
    try {
      const res = await api.get<{ data: ResultData | null; message: string }>(
        `/results/search?year=${year}&class=${cls}&exam_name=${encodeURIComponent(examName)}&student_id=${encodeURIComponent(studentId)}`
      )
      if (res.data) {
        setResult(res.data)
      } else {
        setError(res.message || 'No result found')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const subjectCols = [
    { key: 'subject', label: 'Subject' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
  ]

  const subjectRows = (result?.subjects || []).map((s) => ({
    subject: s.subject,
    grade: <span className={`font-medium ${s.grade === 'F' || s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.grade}</span>,
    gpa: <span className={`font-medium ${Number(s.gpa) === 0 ? 'text-red-600' : ''}`}>{Number(s.gpa).toFixed(2)}</span>,
  }))

  return (
    <PageContainer className="max-w-3xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-2xl md:text-3xl font-bold text-gray-900">Result Search</h1>

      <Card className="mb-8">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Input label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Enter Roll/ID" />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="w-full">
            <Search className="mr-2 h-4 w-4" /> {loading ? 'Searching...' : 'Search Result'}
          </Button>
        </CardContent>
      </Card>

      {searched && result && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-gray-500">Student ID:</span> <span className="font-medium text-gray-900">{result.student_id}</span></div>
              <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{result.name}</span></div>
            </div>
            <div className="mb-4 flex items-center gap-4">
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
                <span className="font-semibold text-gray-900">Final GPA: <span className="text-blue-600">{Number(result.final_gpa).toFixed(2)}</span></span>
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
            <DataTable columns={subjectCols} data={subjectRows} emptyMessage="No subject data" />
          </CardContent>
        </Card>
      )}

      {searched && !result && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3 text-center text-gray-500">
              <p>{error || 'No results found for the given criteria.'}</p>
              <p className="text-sm text-gray-400">Please check your Student ID and try again.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
