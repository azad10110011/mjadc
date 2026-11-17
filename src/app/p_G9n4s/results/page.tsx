'use client'

// Student → My Results (Session 77). Uses GET /api/student/results (same GPA rules as the transcript).

import { useEffect, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { useExamNames } from '@/lib/catalog'
import { partText, totalText, type TranscriptSubjectRow } from '@/components/transcript/TranscriptGenerator'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

interface MyResult {
  student_id: string
  name: string
  class: string
  group: string | null
  exam_name: string
  year: string
  status: 'Passed' | 'Failed'
  final_gpa: number
  grade: string
  gpa_without_optional: number
  optional_gp_above_2: number
  total_marks: number
  position: number | null
  fail_subjects: string[]
  subjects: TranscriptSubjectRow[]
}

export default function StudentResultsPage() {
  const EXAM_NAMES = useExamNames()
  const [studentClass, setStudentClass] = useState<string>('')
  const [examName, setExamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MyResult | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get<{ data?: { student?: { class?: string } } }>('/student/dashboard')
      .then((r) => setStudentClass(r.data?.student?.class || ''))
      .catch(() => {})
  }, [])

  const exams = (studentClass && EXAM_NAMES[studentClass]) || ['Half Yearly', 'Pre-Test', 'Test', 'Final']

  const handleSearch = async () => {
    if (!examName) return
    setLoading(true)
    setMessage('')
    try {
      const r = await api.get<{ data: MyResult }>(`/student/results?exam_name=${encodeURIComponent(examName)}`)
      setResult(r.data)
    } catch (e: unknown) {
      setResult(null)
      setMessage(e instanceof Error ? e.message : 'Could not load the result')
    } finally {
      setLoading(false)
    }
  }

  const passed = result?.status === 'Passed'
  const main = result?.subjects.filter((s) => !s.is_optional) ?? []
  const optional = result?.subjects.filter((s) => s.is_optional) ?? []

  const row = (s: TranscriptSubjectRow, i: number) => {
    const fail = s.grade.toUpperCase() === 'F'
    return (
      <tr key={`${s.subject}-${i}`} className={`border-t border-gray-100 ${fail ? 'bg-red-50' : 'even:bg-gray-50'}`}>
        <td className="px-3 py-2 text-center text-gray-500">{s.code || '–'}</td>
        <td className="px-3 py-2 font-medium text-gray-900">{s.subject}</td>
        <td className="px-2 py-2 text-center">{partText(s.parts?.cq)}</td>
        <td className="px-2 py-2 text-center">{partText(s.parts?.mcq)}</td>
        <td className="px-2 py-2 text-center">{partText(s.parts?.practical)}</td>
        <td className="px-2 py-2 text-center font-semibold">{totalText(s)}</td>
        <td className={`px-2 py-2 text-center font-bold ${fail ? 'text-red-600' : 'text-gray-900'}`}>{s.grade}</td>
        <td className="px-2 py-2 text-center">{s.gpa.toFixed(2)}</td>
      </tr>
    )
  }

  return (
    <PanelLayout role="student" title="My Results">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select label="Select Exam" value={examName} onChange={(e) => setExamName(e.target.value)}
                options={exams.map((e) => ({ value: e, label: e }))} placeholder="Choose exam" />
            </div>
            <Button onClick={handleSearch} disabled={!examName || loading} className="w-full sm:w-auto">
              {loading ? 'Loading...' : 'View Result'}
            </Button>
          </div>
          {message && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> {message}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{result.exam_name} {result.year}</h2>
                <p className="text-sm text-gray-500">{result.name} · {result.student_id} · {result.class}{result.group ? ` · ${result.group}` : ''}</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                {passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-blue-900 p-3 text-center text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">GPA</p>
                <p className="text-2xl font-bold">{result.final_gpa.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-blue-900 p-3 text-center text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Grade</p>
                <p className="text-2xl font-bold">{result.grade}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Position</p>
                <p className="text-2xl font-bold text-gray-900">{result.position ?? '–'}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Total Marks</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(result.total_marks)}</p>
              </div>
            </div>

            {result.fail_subjects.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-1 font-medium text-red-700">Failed Subjects</p>
                <p className="text-sm text-red-600">{result.fail_subjects.join(', ')}</p>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-blue-900 text-white">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-2 py-2">CQ</th>
                    <th className="px-2 py-2">MCQ</th>
                    <th className="px-2 py-2">Prac.</th>
                    <th className="px-2 py-2">Total</th>
                    <th className="px-2 py-2">Grade</th>
                    <th className="px-2 py-2">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {main.map(row)}
                  {optional.length > 0 && (
                    <tr className="border-t border-gray-200 bg-blue-50">
                      <td colSpan={8} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-900">
                        Optional Subject · GP above 2: {result.optional_gp_above_2.toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {optional.map(row)}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              GPA without optional subject: {result.gpa_without_optional.toFixed(2)}. – = no such part · A = absent.
            </p>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
