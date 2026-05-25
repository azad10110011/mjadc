'use client'

import { useState, useRef } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Input, Card, CardContent } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'
import { Printer } from 'lucide-react'

interface SubjectRow {
  subject: string
  total: number
  grade: string
  gpa: number
  status: string
}

interface Transcript {
  student_id: string
  name: string
  father_name: string
  mother_name: string
  date_of_birth: string
  registration_no: string
  class: string
  group: string | null
  exam_name: string
  year: string
  academic_session: string
  student_type: string
  optional_subject: string
  published_at: string | null
  subjects: SubjectRow[]
  overall_gpa: number
  overall_grade: string
  gpa_without_optional: number
  optional_gp_above_2: number
  total_subjects: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not published yet'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ExamControllerTranscriptPage() {
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

  const handlePrint = () => { window.print() }

  return (
    <PanelLayout role="exam_controller" title="Generate Student Transcript">
      <Card className="mb-6 no-print">
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
              <Button variant="secondary" onClick={handlePrint}><Printer className="mr-1 h-4 w-4" /> Print / PDF</Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {transcripts.length > 0 && (
        <div ref={printRef} className="transcript-print-container">
          {transcripts.map((t, idx) => {
            const mainSubjects = t.optional_subject
              ? t.subjects.filter((s) => s.subject !== t.optional_subject)
              : t.subjects
            const hasOptional = Boolean(t.optional_subject && t.subjects.some((s) => s.subject === t.optional_subject))
            const optionalSubjectData = hasOptional ? t.subjects.find((s) => s.subject === t.optional_subject) : null

            return (
              <div key={t.student_id} className={`transcript-page${idx < transcripts.length - 1 ? ' break-after' : ''}`}>
                <div className="header-area">
                  <h2 className="college-name">Miah Jinnah Alam Degree College</h2>
                  <p className="college-address">Garaganj, Shailkupa, Jhenaidah</p>
                  <p className="transcript-title">Student Transcript</p>
                </div>

                <div className="info-grid">
                  <div className="info-item"><span className="info-label">Student Name:</span> {t.name}</div>
                  <div className="info-item"><span className="info-label">Father&apos;s Name:</span> {t.father_name}</div>
                  <div className="info-item"><span className="info-label">Mother&apos;s Name:</span> {t.mother_name}</div>
                  <div className="info-item"><span className="info-label">Roll Number:</span> {t.student_id}</div>
                  <div className="info-item"><span className="info-label">Registration No:</span> {t.registration_no || 'N/A'}</div>
                  <div className="info-item"><span className="info-label">Date of Birth:</span> {t.date_of_birth || 'N/A'}</div>
                  <div className="info-item"><span className="info-label">Exam Name:</span> {t.exam_name}</div>
                  <div className="info-item"><span className="info-label">Exam Year:</span> {t.year}</div>
                  <div className="info-item"><span className="info-label">Academic Session:</span> {t.academic_session || 'N/A'}</div>
                  <div className="info-item"><span className="info-label">Group/Department:</span> {t.group || 'N/A'}</div>
                  <div className="info-item"><span className="info-label">Type:</span> {t.student_type || 'N/A'}</div>
                </div>

                <table className="marks-table">
                  <thead>
                    <tr>
                      <th className="col-sl">SL.NO.</th>
                      <th className="col-subject">Name of Subjects</th>
                      <th className="col-marks">Marks<br />Obtained</th>
                      <th className="col-grade">Letter<br />Grade</th>
                      <th className="col-point">Grade<br />Point</th>
                      <th className="col-without">GPA<br />(Without Optional)</th>
                      <th className="col-gpa">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainSubjects.map((s, i) => (
                      <tr key={i}>
                        <td className="text-center fw-semibold">{i + 1}</td>
                        <td className="fw-semibold">{s.subject}</td>
                        <td className="text-center">
                          {s.grade === 'Absent' ? 'A' : String(Math.round(s.total)).padStart(3, '0')}
                        </td>
                        <td className="text-center">{s.grade}</td>
                        <td className="text-center">{s.gpa.toFixed(2)}</td>
                        {i === 0 && (
                          <td className="text-center fw-bold" rowSpan={mainSubjects.length}>
                            {t.gpa_without_optional.toFixed(2)}
                          </td>
                        )}
                        {i === 0 && (
                          <td className="text-center fw-bold" rowSpan={mainSubjects.length + (hasOptional ? 2 : 0)}>
                            {t.overall_gpa.toFixed(2)}
                          </td>
                        )}
                      </tr>
                    ))}
                    {hasOptional && optionalSubjectData && (
                      <>
                        <tr className="optional-label-row">
                          <td colSpan={6} className="optional-label">Optional Subject :</td>
                        </tr>
                        <tr>
                          <td className="text-center fw-semibold">{mainSubjects.length + 1}</td>
                          <td className="fw-semibold">{optionalSubjectData.subject}</td>
                          <td className="text-center">
                            {optionalSubjectData.grade === 'Absent' ? 'A' : String(Math.round(optionalSubjectData.total)).padStart(3, '0')}
                          </td>
                          <td className="text-center">{optionalSubjectData.grade}</td>
                          <td className="text-center">{optionalSubjectData.gpa.toFixed(2)}</td>
                          <td className="text-center p-0">
                            <div className="gp-above-2-label">GP Above 2</div>
                            <div className="gp-above-2-value">{t.optional_gp_above_2.toFixed(2)}</div>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                <div className="after-table-spacer"></div>
                <div className="footer-area">
                  <div className="footer-left">
                    <span className="fw-semibold">Date of Publication of Result:</span> {formatDate(t.published_at)}
                  </div>
                  <div className="footer-right">
                    <span className="fw-semibold">Controller of Examination</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .no-print {
          font-family: inherit;
        }
        .transcript-print-container {
          font-family: 'Times New Roman', Times, serif;
        }
        .transcript-page {
          padding: 0;
        }
        .header-area {
          text-align: center;
          margin-bottom: 20px;
        }
        .college-name {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
          font-family: 'Times New Roman', Times, serif;
        }
        .college-address {
          font-size: 13px;
          margin: 2px 0;
          font-family: 'Times New Roman', Times, serif;
        }
        .transcript-title {
          font-size: 15px;
          font-weight: 600;
          margin-top: 6px;
          margin-bottom: 0;
          font-family: 'Times New Roman', Times, serif;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px 24px;
          margin-bottom: 12px;
          font-size: 13px;
          font-family: 'Times New Roman', Times, serif;
        }
        .info-item {
          font-family: 'Times New Roman', Times, serif;
        }
        .info-label {
          font-weight: 600;
          font-family: 'Times New Roman', Times, serif;
        }
        .marks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          font-family: 'Times New Roman', Times, serif;
        }
        .marks-table th,
        .marks-table td {
          border: 1px solid black;
          padding: 4px 6px;
        }
        .marks-table th {
          background: white;
          font-weight: bold;
          text-align: center;
          font-family: 'Times New Roman', Times, serif;
        }
        .marks-table td {
          vertical-align: middle;
        }
        .col-sl { width: 50px; }
        .col-marks { width: 90px; }
        .col-grade { width: 65px; }
        .col-point { width: 65px; }
        .col-without { width: 90px; }
        .col-gpa { width: 60px; }
        .text-center { text-align: center; }
        .fw-semibold { font-weight: 600; }
        .fw-bold { font-weight: bold; }
        .optional-label-row td {
          padding: 4px 6px;
          border-left: 1px solid black;
          border-right: 1px solid black;
        }
        .optional-label {
          text-align: left;
          font-weight: 600;
          padding-left: 8px;
        }
        .gp-above-2-label {
          font-size: 10px;
          text-align: center;
          border-bottom: 1px solid black;
          padding: 2px 4px;
        }
        .gp-above-2-value {
          text-align: center;
          padding: 2px 4px;
        }
        .after-table-spacer {
          height: 3em;
        }
        .footer-area {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-family: 'Times New Roman', Times, serif;
        }
        .footer-left {
          text-align: left;
        }
        .footer-right {
          text-align: right;
          padding-top: 2em;
        }
        @media print {
          :global(html), :global(body) {
            margin: 0 !important;
            padding: 0 !important;
          }
          :global(aside) {
            display: none !important;
          }
          :global(header) {
            display: none !important;
          }
          :global(.flex-1.overflow-auto) {
            overflow: visible !important;
            padding: 0 !important;
          }
          :global(.flex.min-h-screen) {
            display: block !important;
          }
          :global(.flex.flex-1.flex-col) {
            display: block !important;
          }
          .break-after {
            page-break-after: always;
            break-after: page;
          }
          .no-print { display: none !important; }
          :global(body) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .transcript-page {
            padding: 40px 50px 20px 50px;
          }
          @page {
            margin: 0;
          }
        }
      `}</style>
    </PanelLayout>
  )
}
