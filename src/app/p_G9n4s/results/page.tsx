'use client'

// Student → My Results (Session 77; access rules Session 115). Uses GET /api/student/results.
// By default the student sees only the summary: GPA when passed, failed subject names when failed.
// When the admin has turned ON online QR verification for this student + exam, the full official
// transcript is shown and can be printed / saved as PDF.

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { useExamNames } from '@/lib/catalog'
import {
  TranscriptSheet, transcriptVerifyUrl, useCollegeLogo, type TranscriptData,
} from '@/components/transcript/TranscriptGenerator'
import { useTranscriptConfig } from '@/components/transcript/transcriptConfig'
import { CheckCircle2, XCircle, Info, Printer, Lock } from 'lucide-react'

interface MyResult {
  student_id: string
  name: string
  class: string
  group: string | null
  exam_name: string
  year: string
  status: 'Passed' | 'Failed'
  final_gpa: number | null
  grade: string
  fail_subjects: string[]
  transcript_available: boolean
  transcript?: TranscriptData
}

export default function StudentResultsPage() {
  const EXAM_NAMES = useExamNames()
  const logoSrc = useCollegeLogo()
  const [config] = useTranscriptConfig()
  const [studentClass, setStudentClass] = useState<string>('')
  const [examName, setExamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MyResult | null>(null)
  const [qr, setQr] = useState('')
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
    setQr('')
    try {
      const r = await api.get<{ data: MyResult }>(`/student/results?exam_name=${encodeURIComponent(examName)}`)
      setResult(r.data)
      const url = r.data.transcript ? transcriptVerifyUrl(r.data.transcript) : null
      if (url) setQr(await QRCode.toDataURL(url, { margin: 0, width: 220, errorCorrectionLevel: 'M' }))
    } catch (e: unknown) {
      setResult(null)
      setMessage(e instanceof Error ? e.message : 'Could not load the result')
    } finally {
      setLoading(false)
    }
  }

  const passed = result?.status === 'Passed'

  return (
    <PanelLayout role="student" title="My Results">
      <Card className="mb-6 no-print">
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
        <Card className="mb-6 no-print">
          <CardContent className="space-y-4 pt-6">
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

            {passed && result.final_gpa !== null && (
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <div className="rounded-xl bg-blue-900 p-3 text-center text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">GPA</p>
                  <p className="text-2xl font-bold">{result.final_gpa.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-blue-900 p-3 text-center text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Grade</p>
                  <p className="text-2xl font-bold">{result.grade}</p>
                </div>
              </div>
            )}

            {!passed && result.fail_subjects.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-1 font-medium text-red-700">Failed Subjects</p>
                <ul className="list-inside list-disc text-sm text-red-600">
                  {result.fail_subjects.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}

            {result.transcript_available && result.transcript ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="flex-1 text-sm text-green-800">Your full transcript is available below.</p>
                <Button variant="primary" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-1 h-4 w-4" /> Print / Download PDF
                </Button>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                Your full transcript will be available here once the college enables online verification for this exam.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {result?.transcript_available && result.transcript && (
        <div className="ts-container">
          <div className="ts-page">
            <TranscriptSheet t={result.transcript} logoSrc={logoSrc} qr={qr || undefined} config={config} />
          </div>
        </div>
      )}

      <style jsx>{`
        .ts-container {
          overflow-x: auto;
        }
        .ts-page {
          margin: 0 auto 24px;
          width: 210mm;
        }
        @media print {
          :global(html), :global(body) { margin: 0 !important; padding: 0 !important; }
          :global(aside), :global(header) { display: none !important; }
          :global(.flex-1.overflow-auto) { overflow: visible !important; padding: 0 !important; }
          :global(.flex.min-h-screen), :global(.flex.flex-1.flex-col) { display: block !important; }
          :global(body) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          :global(.no-print) { display: none !important; }
          .ts-container { overflow: visible; }
          .ts-page { margin: 0; width: auto; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </PanelLayout>
  )
}
