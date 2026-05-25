'use client'

import { useState, useEffect, useRef } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Input, Card, CardContent } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'
import { Printer } from 'lucide-react'

interface SubjectRow {
  subject: string
  parts_data: Record<string, number>
  absent_in: string[]
  total: number
  grade: string
  gpa: number
  status: string
}

interface Transcript {
  student_id: string
  name: string
  class: string
  group: string | null
  exam_name: string
  year: string
  subjects: SubjectRow[]
  overall_gpa: number
  overall_grade: string
  total_subjects: number
}

export default function AdminTranscriptPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [group, setGroup] = useState('')
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []
  const groupOptions = [
    { value: '', label: 'All Groups' },
    { value: 'Science', label: 'Science' },
    { value: 'Business Studies', label: 'Business Studies' },
    { value: 'Humanities', label: 'Humanities' },
  ]

  const handleGenerate = async () => {
    if (!cls || !examName || !year) { setError('Class, Exam Name, and Year are required'); return }
    setLoading(true)
    setError('')
    try {
      const res: any = await api.post('/admin/transcript', {
        class: cls, exam_name: examName, year,
        ...(studentId && { student_id: studentId }),
        ...(group && { group }),
      })
      setTranscripts(res.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate transcript')
      setTranscripts([])
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <PanelLayout role="admin" title="Generate Transcript">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Select label="Group (Optional)" options={groupOptions} value={group} onChange={(e) => setGroup(e.target.value)} />
            <Input label="Student ID (Optional)" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Leave empty for all" />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleGenerate} disabled={loading || !cls || !examName || !year}>
              {loading ? 'Generating...' : 'Generate Transcript'}
            </Button>
            {transcripts.length > 0 && (
              <Button variant="secondary" onClick={handlePrint}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {transcripts.length > 0 && (
        <div ref={printRef} className="space-y-8">
          {transcripts.map((t) => (
            <Card key={t.student_id} className="print:shadow-none print:border-0">
              <CardContent className="pt-6">
                <div className="mb-6 border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-900">Mujibul Academic College</h2>
                  <p className="text-sm text-gray-500">Student Transcript</p>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Name:</span> {t.name}</div>
                  <div><span className="font-medium">Roll:</span> {t.student_id}</div>
                  <div><span className="font-medium">Class:</span> {t.class}</div>
                  <div><span className="font-medium">Group:</span> {t.group || 'N/A'}</div>
                  <div><span className="font-medium">Exam:</span> {t.exam_name} {t.year}</div>
                </div>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold">Subject</th>
                      <th className="px-3 py-2 text-center font-semibold">Marks</th>
                      <th className="px-3 py-2 text-center font-semibold">Total</th>
                      <th className="px-3 py-2 text-center font-semibold">Grade</th>
                      <th className="px-3 py-2 text-center font-semibold">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.subjects.map((s, i) => {
                      const partsStr = Object.entries(s.parts_data)
                        .filter(([k]) => !s.absent_in.includes(k))
                        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                        .join(', ')
                      const hasAbsent = s.absent_in.length > 0
                      return (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="px-3 py-2 font-medium">{s.subject}</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-600">
                            {partsStr}
                            {hasAbsent && <span className="ml-1 text-red-500">Absent: {s.absent_in.join(', ')}</span>}
                          </td>
                          <td className={`px-3 py-2 text-center font-medium ${s.grade === 'Absent' || s.grade === 'F' ? 'text-red-600' : ''}`}>
                            {s.total}
                          </td>
                          <td className={`px-3 py-2 text-center font-medium ${s.grade === 'Absent' || s.grade === 'F' ? 'text-red-600' : ''}`}>
                            {s.grade}
                          </td>
                          <td className="px-3 py-2 text-center font-medium">{s.grade === 'Absent' ? 'Absent' : s.gpa.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <td className="px-3 py-2" colSpan={3}>Total Subjects: {t.total_subjects}</td>
                      <td className="px-3 py-2 text-center">{t.overall_grade}</td>
                      <td className="px-3 py-2 text-center">{t.overall_gpa.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <style jsx>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </PanelLayout>
  )
}
