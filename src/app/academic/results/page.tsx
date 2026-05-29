'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Button, Input, Select, Card, CardContent, DataTable } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'
import { PageContainer } from '@/components/ui/PageContainer'

interface SubjectResult {
  subject: string
  mcq: number
  cq: number
  practical: number
  parts_data: Record<string, number> | null
  total: number
  grade: string
  gpa: number
  absent_in: string[]
}

interface ResultData {
  student_id: string
  name: string
  subjects: SubjectResult[]
  gpa: string
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
    { key: 'marks', label: 'Marks' },
    { key: 'total', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'gpa', label: 'GPA' },
  ]

  const subjectRows = (result?.subjects || []).map((s) => {
    let marksStr = ''
    if (s.parts_data) {
      marksStr = Object.entries(s.parts_data)
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join(', ')
    } else {
      const parts = []
      if (s.mcq != null) parts.push(`MCQ: ${s.mcq}`)
      if (s.cq != null) parts.push(`CQ: ${s.cq}`)
      if (s.practical != null) parts.push(`Practical: ${s.practical}`)
      marksStr = parts.join(', ')
    }
    return {
      subject: s.subject,
      marks: (
        <span className={s.absent_in.length > 0 ? 'text-red-600' : ''}>
          {s.absent_in.length > 0 ? `Absent in: ${s.absent_in.join(', ')}` : marksStr}
        </span>
      ),
      total: s.total,
      grade: <span className={`font-medium ${s.grade === 'F' || s.grade === 'Absent' ? 'text-red-600' : ''}`}>{s.grade}</span>,
      gpa: s.grade === 'Absent' ? 'Absent' : s.gpa,
    }
  })

  return (
    <PageContainer className="max-w-3xl">
      <Link href="/" className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-blue-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Result Search</h1>

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
              <div><span className="text-gray-500">GPA:</span> <span className="font-semibold text-blue-600">{result.gpa}</span></div>
            </div>
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
