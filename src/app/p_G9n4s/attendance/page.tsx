'use client'

// Student → My Attendance (Session 79): overall %, per-subject table, day-by-day records
// with subject + month filters, and a printable report.

import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { Printer, CalendarCheck, Check, X } from 'lucide-react'

interface SubjectRow { subject: string; total: number; present: number; absent: number; percentage: number; teachers: string | null }
interface DayRow { date: string; subject: string; status: 'present' | 'absent'; teacher: string | null }
interface Report {
  student: { student_id: string; name: string; class: string; student_group: string | null }
  summary: { total: number; present: number; absent: number; percentage: number }
  subjects: SubjectRow[]
  records: DayRow[]
}

const tone = (p: number) => (p >= 75 ? 'bg-green-100 text-green-800' : p >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700')
const bar = (p: number) => (p >= 75 ? 'bg-green-500' : p >= 50 ? 'bg-yellow-500' : 'bg-red-500')
const niceDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentAttendancePage() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')
  const [month, setMonth] = useState('') // YYYY-MM

  useEffect(() => {
    api.get<{ data: Report }>('/student/attendance')
      .then((r) => setReport(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load attendance'))
  }, [])

  const months = useMemo(() => [...new Set((report?.records || []).map((r) => r.date.slice(0, 7)))], [report])
  const days = useMemo(() => (report?.records || []).filter((r) =>
    (!subject || r.subject === subject) && (!month || r.date.startsWith(month))), [report, subject, month])
  const dayPresent = days.filter((d) => d.status === 'present').length
  const s = report?.summary

  return (
    <PanelLayout role="student" title="My Attendance">
      <div className="att-report mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><CalendarCheck className="h-5 w-5 text-blue-700" /> Attendance Report</h2>
            {report && (
              <p className="text-sm text-gray-500">
                {report.student.name} · {report.student.student_id} · {report.student.class}{report.student.student_group ? ` · ${report.student.student_group}` : ''}
              </p>
            )}
          </div>
          {report && report.summary.total > 0 && (
            <Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!report && !error && <p className="text-sm text-gray-500">Loading…</p>}

        {s && s.total === 0 && (
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No attendance has been recorded for you yet.</p>
        )}

        {report && s && s.total > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-blue-900 p-4 text-center text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Overall</p>
                <p className="text-3xl font-bold">{s.percentage}%</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Classes</p>
                <p className="text-3xl font-bold text-gray-900">{s.total}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Present</p>
                <p className="text-3xl font-bold text-green-700">{s.present}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Absent</p>
                <p className="text-3xl font-bold text-red-600">{s.absent}</p>
              </div>
            </div>
            {s.percentage < 75 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                Your attendance is below 75%. Please attend classes regularly.
              </p>
            )}

            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-3 font-semibold text-gray-900">Subject-wise</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-3 py-2.5">Subject</th>
                        <th className="px-3 py-2.5 text-center">Classes</th>
                        <th className="px-3 py-2.5 text-center">Present</th>
                        <th className="px-3 py-2.5 text-center">Absent</th>
                        <th className="w-40 px-3 py-2.5">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.subjects.map((r) => (
                        <tr key={r.subject}>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-gray-900">{r.subject}</p>
                            {r.teachers && <p className="text-xs text-gray-500">{r.teachers}</p>}
                          </td>
                          <td className="px-3 py-2.5 text-center">{r.total}</td>
                          <td className="px-3 py-2.5 text-center text-green-700">{r.present}</td>
                          <td className="px-3 py-2.5 text-center text-red-600">{r.absent}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                                <div className={`h-full ${bar(r.percentage)}`} style={{ width: `${r.percentage}%` }} />
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone(r.percentage)}`}>{r.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">Day-by-day</h3>
                  <div className="no-print flex flex-wrap gap-2">
                    <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">
                      <option value="">All subjects</option>
                      {report.subjects.map((r) => <option key={r.subject} value={r.subject}>{r.subject}</option>)}
                    </select>
                    <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">
                      <option value="">All months</option>
                      {months.map((m) => {
                        const [y, mm] = m.split('-').map(Number)
                        return <option key={m} value={m}>{new Date(y, mm - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>
                      })}
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{days.length} classes · {dayPresent} present · {days.length - dayPresent} absent</p>
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {days.map((d, i) => (
                    <li key={`${d.date}-${d.subject}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${d.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {d.status === 'present' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{d.subject}</span>
                        <span className="block text-xs text-gray-500">{niceDate(d.date)}{d.teacher ? ` · ${d.teacher.trim()}` : ''}</span>
                      </span>
                      <span className={`text-xs font-semibold ${d.status === 'present' ? 'text-green-700' : 'text-red-600'}`}>{d.status === 'present' ? 'Present' : 'Absent'}</span>
                    </li>
                  ))}
                  {days.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-500">No classes match these filters</li>}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          .flex.min-h-screen, .flex.flex-1.flex-col { display: block !important; }
          .flex-1.overflow-auto { overflow: visible !important; padding: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .att-report li { break-inside: avoid; }
        }
      `}</style>
    </PanelLayout>
  )
}
