'use client'

// Admin -> Exam Management -> Result Summary (Session 73)
// Year / Class / Exam / Group, include failed students or not, sort by merit position / ID / roll / name.
// GPA, fail, absent and optional rules come from the backend transcript builder.

import { useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent } from '@/components/ui'
import { useExamNames } from '@/lib/catalog'
import { api } from '@/lib/api'
import { useGroupOptions } from '@/lib/catalog'
import { Printer } from 'lucide-react'
import { COLLEGE_ADDRESS, COLLEGE_NAME, useCollegeLogo } from '@/components/transcript/TranscriptGenerator'

interface SubjectCell {
  subject: string
  code: string
  total: number
  grade: string
  gpa: number
  absent: boolean
  is_optional: boolean
}

interface Row {
  student_id: string
  name: string
  group: string | null
  class_roll: string
  subjects: SubjectCell[]
  total_marks: number
  gpa: number
  gpa_without_optional: number
  grade: string
  passed: boolean
  failed_subjects: string[]
  position: number | null
  merit_index: number
}

interface GroupStat { group: string; appeared: number; passed: number; failed: number; gpa5: number }

interface Summary {
  exam: { id: number; year: string; class: string; exam_name: string }
  group: string
  stats: {
    registered: number
    appeared: number
    no_result: number
    passed: number
    failed: number
    pass_rate: number
    gpa5: number
    grade_distribution: Record<string, number>
    by_group: GroupStat[]
  }
  rows: Row[]
}

const GROUPS_BEFORE = [{ value: '', label: 'All Groups' }]
const FAIL_OPTIONS = [
  { value: 'yes', label: 'Show failed students' },
  { value: 'no', label: 'Hide failed students' },
  { value: 'only', label: 'Only failed students' },
]
const SORT_OPTIONS = [
  { value: 'position', label: 'Merit Position (this exam)' },
  { value: 'id', label: 'Student ID' },
  { value: 'roll', label: 'Class Roll' },
  { value: 'name', label: 'Name (A–Z)' },
]
const GRADES = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F']

const cmpNum = (a: string, b: string) => {
  const na = Number(a), nb = Number(b)
  if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return a.localeCompare(b)
}
const fmtMarks = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export default function ResultSummaryPage() {
  const GROUPS = useGroupOptions(GROUPS_BEFORE)
  const EXAM_NAMES = useExamNames()
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [group, setGroup] = useState('')
  const [failMode, setFailMode] = useState('yes')
  const [sortBy, setSortBy] = useState('position')
  const [showSubjects, setShowSubjects] = useState(true)
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const logoSrc = useCollegeLogo()

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls]?.map((e) => ({ value: e, label: e })) : []

  const generate = async () => {
    if (!cls || !examName || !year) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post<{ data: Summary }>('/admin/result-summary', {
        year, class: cls, exam_name: examName, ...(group && { group }),
      })
      setData(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load result summary')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // Filter (failed students) + sort, done in the browser so changing them is instant
  const rows = useMemo(() => {
    if (!data) return []
    const list = data.rows.filter((r) => (failMode === 'no' ? r.passed : failMode === 'only' ? !r.passed : true))
    const sorted = [...list]
    if (sortBy === 'position') sorted.sort((a, b) => a.merit_index - b.merit_index)
    if (sortBy === 'id') sorted.sort((a, b) => cmpNum(a.student_id, b.student_id))
    if (sortBy === 'roll') sorted.sort((a, b) => cmpNum(a.class_roll || '', b.class_roll || '') || cmpNum(a.student_id, b.student_id))
    if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [data, failMode, sortBy])

  // Subject columns: every subject that appears, ordered by code
  const subjectCols = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) for (const s of r.subjects) if (!map.has(s.subject)) map.set(s.subject, s.code)
    return [...map.entries()]
      .sort((a, b) => cmpNum(a[1] || '999999', b[1] || '999999') || a[0].localeCompare(b[0]))
      .map(([subject, code]) => ({ subject, code }))
  }, [rows])

  const st = data?.stats
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label
  const failLabel = FAIL_OPTIONS.find((o) => o.value === failMode)?.label

  return (
    <PanelLayout role="admin" title="Result Summary">
      <Card className="mb-6 no-print">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => { setYear(e.target.value); setData(null) }} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName(''); setData(null) }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => { setExamName(e.target.value); setData(null) }}
              placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Select label="Group" options={GROUPS} value={group} onChange={(e) => { setGroup(e.target.value); setData(null) }} />
            <Select label="Failed Students" options={FAIL_OPTIONS} value={failMode} onChange={(e) => setFailMode(e.target.value)} />
            <Select label="Sort By" options={SORT_OPTIONS} value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
            <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={showSubjects} onChange={(e) => setShowSubjects(e.target.checked)} className="h-4 w-4" />
              Show subject-wise marks
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={generate} disabled={loading || !cls || !examName}>
              {loading ? 'Loading...' : 'Generate Summary'}
            </Button>
            {data && rows.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Print / PDF
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-gray-500">
            Merit position: counted across the whole class (all groups), the same as on the transcript. Passed students
            only, by GPA, then total marks (equal GPA and equal total share a position).
            Failed students have no position and are listed after passed students.
          </p>
        </CardContent>
      </Card>

      {data && st && (
        <div className="report">
          <div className="r-head">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Logo" className="r-logo" />
            )}
            <div>
              <h2 className="r-college">{COLLEGE_NAME}</h2>
              <p className="r-addr">{COLLEGE_ADDRESS}</p>
              <p className="r-title">RESULT SUMMARY</p>
              <p className="r-exam">
                {data.exam.exam_name} Examination {data.exam.year} · Class {data.exam.class} · {data.group || 'All Groups'}
              </p>
            </div>
          </div>

          <div className="stats">
            <div className="stat"><span>Registered</span><b>{st.registered}</b></div>
            <div className="stat"><span>Appeared</span><b>{st.appeared}</b></div>
            <div className="stat ok"><span>Passed</span><b>{st.passed}</b></div>
            <div className="stat bad"><span>Failed</span><b>{st.failed}</b></div>
            <div className="stat main"><span>Pass Rate</span><b>{st.pass_rate}%</b></div>
            <div className="stat main"><span>GPA 5.00</span><b>{st.gpa5}</b></div>
          </div>

          <div className="mini-tables">
            <table className="mini">
              <thead>
                <tr><th colSpan={GRADES.length}>Grade Distribution</th></tr>
                <tr>{GRADES.map((g) => <th key={g}>{g}</th>)}</tr>
              </thead>
              <tbody>
                <tr>{GRADES.map((g) => <td key={g}>{st.grade_distribution[g] ?? 0}</td>)}</tr>
              </tbody>
            </table>
            {st.by_group.length > 1 && (
              <table className="mini">
                <thead>
                  <tr><th>Group</th><th>Appeared</th><th>Passed</th><th>Failed</th><th>Pass %</th><th>GPA 5</th></tr>
                </thead>
                <tbody>
                  {st.by_group.map((g) => (
                    <tr key={g.group}>
                      <td className="l">{g.group}</td><td>{g.appeared}</td><td>{g.passed}</td><td>{g.failed}</td>
                      <td>{g.appeared ? ((g.passed * 100) / g.appeared).toFixed(2) : '0.00'}%</td><td>{g.gpa5}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="r-note">
            {failLabel} · Sorted by {sortLabel} · Showing {rows.length} of {st.appeared} student(s)
            {st.no_result > 0 && <> · {st.no_result} registered student(s) have no result for this exam</>}
          </p>

          <div className="tbl-wrap">
            <table className="sum">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Position</th>
                  <th>Student ID</th>
                  <th>Roll</th>
                  <th className="l">Name</th>
                  {!data.group && <th>Group</th>}
                  {showSubjects && subjectCols.map((c) => (
                    <th key={c.subject} className="subj" title={c.subject}>
                      {c.code ? <>{c.code}<br /></> : null}<span>{c.subject}</span>
                    </th>
                  ))}
                  <th>Total Marks</th>
                  <th>GPA</th>
                  <th>Grade</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const bySubject = new Map(r.subjects.map((s) => [s.subject, s]))
                  return (
                    <tr key={r.student_id} className={r.passed ? '' : 'fail'}>
                      <td>{i + 1}</td>
                      <td className="b">{r.position ?? '–'}</td>
                      <td>{r.student_id}</td>
                      <td>{r.class_roll || '–'}</td>
                      <td className="l nm">{r.name}</td>
                      {!data.group && <td>{r.group || '–'}</td>}
                      {showSubjects && subjectCols.map((c) => {
                        const s = bySubject.get(c.subject)
                        if (!s) return <td key={c.subject} className="na">–</td>
                        const f = s.grade.toUpperCase() === 'F'
                        return (
                          <td key={c.subject} className={f ? 'fcell' : ''}>
                            {s.absent ? 'A' : fmtMarks(s.total)}
                            <small>{s.grade}{s.is_optional ? '*' : ''}</small>
                          </td>
                        )
                      })}
                      <td className="b">{fmtMarks(r.total_marks)}</td>
                      <td className="b">{r.gpa.toFixed(2)}</td>
                      <td className="b">{r.grade}</td>
                      <td>
                        {r.passed ? <span className="pass">Passed</span> : (
                          <span className="failtxt" title={r.failed_subjects.join(', ')}>
                            Failed{r.failed_subjects.length > 0 && ` (${r.failed_subjects.length})`}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={20} className="empty">No students match these options</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {showSubjects && <p className="r-foot">* Optional subject. A = absent. Red cells = failed subject.</p>}

          <div className="signs">
            <div className="sign"><div className="line" />Controller of Examinations</div>
            <div className="sign"><div className="line" />Principal</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .report {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          font-family: 'Times New Roman', Times, serif;
          color: #0f172a;
        }
        .r-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 2px solid #1e3a8a;
        }
        .r-logo { height: 62px; width: 62px; object-fit: contain; }
        .r-college { margin: 0; font-size: 22px; font-weight: bold; color: #1e3a8a; }
        .r-addr { margin: 0; font-size: 12.5px; }
        .r-title {
          display: inline-block;
          margin: 6px 0 0;
          background: #1e3a8a;
          color: #fff;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 3px;
          padding: 2px 18px;
          border-radius: 999px;
        }
        .r-exam { margin: 4px 0 0; font-size: 13px; font-weight: 700; color: #b91c1c; }
        .stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 12px 0 10px; }
        .stat {
          display: inline-flex;
          align-items: baseline;
          gap: 7px;
          border: 1px solid #93c5fd;
          background: #eff6ff;
          border-radius: 999px;
          padding: 3px 14px;
        }
        .stat span { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.3px; }
        .stat b { font-size: 15px; }
        .stat.ok { background: #f0fdf4; border-color: #86efac; }
        .stat.ok span, .stat.ok b { color: #166534; }
        .stat.bad { background: #fef2f2; border-color: #fca5a5; }
        .stat.bad span, .stat.bad b { color: #b91c1c; }
        .stat.main { background: #1e3a8a; border-color: #1e3a8a; }
        .stat.main span, .stat.main b { color: #fff; }
        .mini-tables { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-bottom: 8px; }
        .mini { border-collapse: collapse; font-size: 12px; }
        .mini th, .mini td { border: 1px solid #94a3b8; padding: 2px 9px; text-align: center; }
        .mini thead th { background: #1e3a8a; color: #fff; }
        .mini thead tr + tr th { background: #dbeafe; color: #1e3a8a; }
        .mini .l { text-align: left; }
        .r-note { margin: 6px 0; font-size: 12px; color: #475569; }
        .tbl-wrap { overflow-x: auto; }
        .sum { width: 100%; border-collapse: collapse; font-size: 12px; }
        .sum th, .sum td { border: 1px solid #94a3b8; padding: 3px 5px; text-align: center; vertical-align: middle; }
        .sum th { background: #1e3a8a; color: #fff; font-weight: bold; line-height: 1.15; }
        .sum th.subj { font-size: 10.5px; min-width: 46px; }
        .sum th.subj span { font-weight: normal; font-size: 9.5px; }
        .sum tbody tr:nth-child(even) { background: #f1f5f9; }
        .sum tr.fail { background: #fef2f2 !important; }
        .sum td small { margin-left: 3px; font-size: 9.5px; color: #475569; }
        .sum td { white-space: nowrap; }
        .sum td.fcell { color: #b91c1c; font-weight: 700; }
        .sum td.fcell small { color: #b91c1c; }
        .sum td.na { color: #94a3b8; }
        .l { text-align: left !important; }
        .nm { white-space: nowrap; font-weight: 600; }
        .b { font-weight: 700; }
        .pass { color: #166534; font-weight: 700; }
        .failtxt { color: #b91c1c; font-weight: 700; }
        .empty { padding: 14px !important; color: #64748b; font-style: italic; }
        .r-foot { margin: 4px 0 0; font-size: 11px; color: #475569; }
        .signs { display: flex; justify-content: space-between; margin-top: 46px; font-size: 13px; font-weight: 600; }
        .sign { text-align: center; }
        .line { width: 190px; border-top: 1px solid #0f172a; margin-bottom: 4px; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          :global(html), :global(body) { margin: 0 !important; padding: 0 !important; }
          :global(aside), :global(header) { display: none !important; }
          :global(.flex-1.overflow-auto) { overflow: visible !important; padding: 0 !important; }
          :global(.flex.min-h-screen), :global(.flex.flex-1.flex-col) { display: block !important; }
          :global(body) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          :global(.no-print) { display: none !important; }
          .report { border: none; border-radius: 0; padding: 0; }
          .tbl-wrap { overflow: visible; }
          .sum thead { display: table-header-group; }
          .sum tr { break-inside: avoid; }
          .sum { font-size: 11px; }
          .sum th, .sum td { padding: 2px 4px; }
          .r-logo { height: 50px; width: 50px; }
          .stats { margin: 8px 0 6px; }
          .signs { margin-top: 34px; break-inside: avoid; }
        }
      `}</style>
    </PanelLayout>
  )
}
