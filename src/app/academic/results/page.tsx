'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Button, Input, Select, Card, CardContent } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'

interface ResultData {
  student_id: string
  name: string
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Student ID:</span> <span className="font-medium text-gray-900">{result.student_id}</span></div>
              <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{result.name}</span></div>
              <div><span className="text-gray-500">GPA:</span> <span className="font-semibold text-blue-600">{result.gpa}</span></div>
            </div>
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
    </div>
  )
}
