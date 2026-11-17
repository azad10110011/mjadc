'use client'

// Exam Management › Exam Fee Paid List (Session 96): students who paid an exam's fee, subject-wise.
// Download one subject or all subjects (one subject per page) as PDF, or every subject as Excel sheets.

import { useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { useExamNames, useGroupOptions } from '@/lib/catalog'
import { COLLEGE, COLLEGE_ADDR, finishPdf, loadLogo } from '@/lib/examPdf'
import { FileDown, FileSpreadsheet, FileText, Printer, Search, ChevronDown, ChevronRight } from 'lucide-react'

interface PaidStudent {
  student_id: string
  name: string
  class: string
  group: string
  class_roll: string | null
  paid: number
  waived: number
  fee: number
  status: 'paid' | 'partial'
  last_paid: string | null
  type?: 'compulsory' | 'selective' | 'optional'
}
interface SubjectList { subject: string; subject_group?: string; types: string[]; count: number; students: PaidStudent[] }
interface Report {
  year: number; exam_name: string; class: string; group: string
  total_students: number; total_amount: number
  students: PaidStudent[]; subjects: SubjectList[]
}

const CLASSES = ['12th', '11th']
const ALL_GROUPS = [{ value: '', label: 'All Groups' }]
const TYPE_LABEL: Record<string, string> = { compulsory: 'Compulsory', selective: 'Selective', optional: 'Optional' }
const selectCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const tk = (n: number) => `${Math.round(n).toLocaleString('en-US')}`
const groupTitle = (g?: string) => (g === 'General' ? 'General (Compulsory & common)' : g || 'Other') + ' Subjects'
const fileSafe = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')

export default function ExamFeePaidListPage() {
  const examNames = useExamNames()
  const groupOptions = useGroupOptions(ALL_GROUPS)
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(String(thisYear))
  const [cls, setCls] = useState('12th')
  const [exam, setExam] = useState('')
  const [group, setGroup] = useState('')
  const [onlyFull, setOnlyFull] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const exams = examNames[cls] || []
  const examValue = exams.includes(exam) ? exam : exams[0] || ''
  const years = Array.from({ length: 13 }, (_, i) => String(thisYear - 2 + i))

  const load = async () => {
    if (!examValue) return
    setLoading(true); setError(''); setOpen(null)
    try {
      const res = await api.post<{ data: Report }>('/admin/exam-fees/paid-by-subject', { year: Number(year), exam_name: examValue, class: cls, group })
      setReport(res.data)
    } catch (e) {
      setReport(null)
      setError(e instanceof Error ? e.message : 'Failed to load the list')
    } finally {
      setLoading(false)
    }
  }

  // optional filter: only students whose fee is fully paid
  const subjects = useMemo(() => {
    if (!report) return []
    return report.subjects
      .map((s) => {
        const students = onlyFull ? s.students.filter((x) => x.status === 'paid') : s.students
        return { ...s, students, count: students.length }
      })
      .filter((s) => s.count > 0)
  }, [report, onlyFull])
  const shownStudents = useMemo(() => (report ? (onlyFull ? report.students.filter((x) => x.status === 'paid') : report.students) : []), [report, onlyFull])
  const partialCount = report ? report.students.filter((x) => x.status === 'partial').length : 0

  const title = report ? `${report.exam_name} Examination ${report.year} — Fee Paid Candidates` : ''
  const subTitle = report ? `Class ${report.class || 'All'}${report.group ? ` · ${report.group}` : ''}` : ''

  // ---------- PDF: one subject per page (or a single subject) ----------
  const buildPdf = async (list: SubjectList[]) => {
    const logo = await loadLogo()
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    list.forEach((s, idx) => {
      if (idx > 0) doc.addPage()
      const startPage = doc.getNumberOfPages()
      const header = () => {
        if (logo) doc.addImage(logo, 'PNG', 14, 9, 15, 15, 'logo', 'FAST')
        doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(30, 58, 138)
        doc.text(COLLEGE, W / 2, 14, { align: 'center' })
        doc.setFont('times', 'normal'); doc.setFontSize(9.5); doc.setTextColor(60)
        doc.text(COLLEGE_ADDR, W / 2, 19, { align: 'center' })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0)
        doc.text(title.replace('—', '-'), W / 2, 27, { align: 'center' })
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
        doc.text(`Subject: ${s.subject}   ·   ${subTitle}   ·   Candidates: ${s.count}`, W / 2, 33, { align: 'center' })
        doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.4); doc.line(14, 36, W - 14, 36)
      }
      header()
      autoTable(doc, {
        startY: 40,
        margin: { top: 40, left: 14, right: 14, bottom: 16 },
        head: [['SL', 'Student ID', 'Roll', 'Name', 'Group', 'Subject Type', 'Paid (Tk)']],
        body: s.students.map((x, i) => [
          String(i + 1), x.student_id, x.class_roll || '-', x.name, x.group,
          TYPE_LABEL[x.type || ''] || '-', x.status === 'partial' ? `${tk(x.paid)} (partial)` : tk(x.paid),
        ]),
        styles: { fontSize: 9, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.1 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 22 }, 2: { halign: 'center', cellWidth: 13 }, 6: { halign: 'right', cellWidth: 24 } },
        didDrawPage: () => { if (doc.getNumberOfPages() > startPage) header() },
      })
    })
    const n = doc.getNumberOfPages()
    for (let p = 1; p <= n; p++) {
      doc.setPage(p)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120)
      doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 14, doc.internal.pageSize.getHeight() - 8)
      doc.text(`Page ${p} of ${n}`, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
    }
    return doc
  }

  // ---------- Summary PDF: subject-wise candidate totals (Session 97) ----------
  const groupCols = useMemo(() => {
    const present = new Set(shownStudents.map((x) => x.group))
    return groupOptions.map((g) => g.value).filter((g) => g && present.has(g))
      .concat([...present].filter((g) => !groupOptions.some((o) => o.value === g)))
  }, [shownStudents, groupOptions])

  const buildSummaryPdf = async () => {
    const logo = await loadLogo()
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const header = () => {
      if (logo) doc.addImage(logo, 'PNG', 14, 9, 15, 15, 'logo', 'FAST')
      doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(30, 58, 138)
      doc.text(COLLEGE, W / 2, 14, { align: 'center' })
      doc.setFont('times', 'normal'); doc.setFontSize(9.5); doc.setTextColor(60)
      doc.text(COLLEGE_ADDR, W / 2, 19, { align: 'center' })
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0)
      doc.text(title.replace('—', '-'), W / 2, 27, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(`Subject-wise Summary   ·   ${subTitle}${onlyFull ? '   ·   Fully paid only' : ''}`, W / 2, 33, { align: 'center' })
      doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.4); doc.line(14, 36, W - 14, 36)
    }
    header()
    // overview boxes
    const boxes: [string, string][] = [
      ['Total Candidates', String(shownStudents.length)],
      ...groupCols.map((g): [string, string] => [g, String(shownStudents.filter((x) => x.group === g).length)]),
      ['Total Collected (Tk)', tk(shownStudents.reduce((a, x) => a + x.paid, 0))],
    ]
    const bw = (W - 28 - (boxes.length - 1) * 3) / boxes.length
    boxes.forEach(([label, value], i) => {
      const x = 14 + i * (bw + 3)
      doc.setFillColor(239, 246, 255); doc.setDrawColor(191, 219, 254); doc.roundedRect(x, 39, bw, 13, 1.5, 1.5, 'FD')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105)
      doc.text(label, x + bw / 2, 43.5, { align: 'center' })
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 58, 138)
      doc.text(value, x + bw / 2, 49.5, { align: 'center' })
    })
    const typeText = (t: string[]) => t.map((x) => TYPE_LABEL[x] || x).join(' / ')
    const nCols = 4 + groupCols.length
    const body: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = []
    let lastGroup = ''
    subjects.forEach((sub, i) => {
      if (sub.subject_group !== lastGroup) {
        lastGroup = sub.subject_group || ''
        body.push([{ content: groupTitle(sub.subject_group), colSpan: nCols, styles: { fillColor: [219, 234, 254], textColor: [30, 58, 138], fontStyle: 'bold', halign: 'left' } }])
      }
      body.push([
        String(i + 1), sub.subject, typeText(sub.types),
        ...groupCols.map((g) => String(sub.students.filter((x) => x.group === g).length || '-')),
        String(sub.count),
      ])
    })
    autoTable(doc, {
      startY: 55,
      margin: { top: 40, left: 14, right: 14, bottom: 30 },
      head: [['SL', 'Subject', 'Type', ...groupCols, 'Total']],
      body,
      foot: [['', 'Total candidates (each counted once)', '', ...groupCols.map((g) => String(shownStudents.filter((x) => x.group === g).length)), String(shownStudents.length)]],
      showFoot: 'lastPage',
      styles: { fontSize: 9, cellPadding: 1.25, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'left' }, 2: { cellWidth: 34 },
        ...Object.fromEntries(groupCols.map((_, i) => [3 + i, { halign: 'center', cellWidth: 22 }])),
        [3 + groupCols.length]: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      },
      didParseCell: (d) => { if (d.section === 'foot' && d.column.index === 1) d.cell.styles.halign = 'left' },
      didDrawPage: (d) => { if (d.pageNumber > 1) header() },
    })
    // signatures on the last page
    const y = Math.min(H - 16, ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200) + 20)
    doc.setDrawColor(100); doc.setLineWidth(0.3); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30)
    ;[['Prepared by', 40], ['Controller of Examinations', W / 2], ['Principal', W - 40]].forEach(([label, x]) => {
      doc.line((x as number) - 24, y, (x as number) + 24, y)
      doc.text(label as string, x as number, y + 4.5, { align: 'center' })
    })
    const n = doc.getNumberOfPages()
    for (let p = 1; p <= n; p++) {
      doc.setPage(p)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120)
      doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 14, H - 8)
      doc.text(`Page ${p} of ${n}`, W - 14, H - 8, { align: 'right' })
    }
    return doc
  }

  const summaryPdf = async (mode: 'download' | 'print') => {
    if (!report || subjects.length === 0) return
    setBusy(true)
    try {
      finishPdf(await buildSummaryPdf(), `${baseName}-Subject-Summary.pdf`, mode)
    } finally {
      setBusy(false)
    }
  }

  const pdf = async (list: SubjectList[], mode: 'download' | 'print', name: string) => {
    if (!report || list.length === 0) return
    setBusy(true)
    try {
      finishPdf(await buildPdf(list), name, mode)
    } finally {
      setBusy(false)
    }
  }

  // ---------- Excel: "All candidates" sheet + one sheet per subject ----------
  const excel = (list: SubjectList[], name: string) => {
    if (!report) return
    const wb = XLSX.utils.book_new()
    const toRows = (arr: PaidStudent[], withType: boolean) => arr.map((x, i) => ({
      SL: i + 1, 'Student ID': x.student_id, Roll: x.class_roll || '', Name: x.name, Group: x.group, Class: x.class,
      ...(withType ? { 'Subject Type': TYPE_LABEL[x.type || ''] || '' } : {}),
      'Paid (Tk)': x.paid, Status: x.status === 'paid' ? 'Paid' : 'Partial',
    }))
    if (list.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(shownStudents, false)), 'All candidates')
    const used = new Set<string>()
    for (const s of list) {
      let sheet = s.subject.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
      while (used.has(sheet)) sheet = sheet.slice(0, 28) + '_' + used.size
      used.add(sheet)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(s.students, true)), sheet)
    }
    XLSX.writeFile(wb, name)
  }

  const baseName = report ? fileSafe(`${report.exam_name}-${report.year}-${report.class}${report.group ? '-' + report.group : ''}-Fee-Paid`) : ''

  return (
    <PanelLayout role="admin" title="Exam Fee Paid List">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Year</span>
                <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>{years.map((y) => <option key={y}>{y}</option>)}</select>
              </label>
              <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Class</span>
                <select value={cls} onChange={(e) => setCls(e.target.value)} className={selectCls}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Exam</span>
                <select value={examValue} onChange={(e) => setExam(e.target.value)} className={selectCls}>{exams.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="text-sm"><span className="mb-1 block font-medium text-gray-700">Group</span>
                <select value={group} onChange={(e) => setGroup(e.target.value)} className={selectCls}>{groupOptions.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select>
              </label>
              <Button onClick={load} disabled={loading || !examValue}><Search className="mr-1 h-4 w-4" /> {loading ? 'Loading…' : 'Show List'}</Button>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {report && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                  <p className="text-sm text-gray-600">{subTitle}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">Candidates <b>{shownStudents.length}</b></span>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-800">Collected <b>৳{tk(shownStudents.reduce((a, x) => a + x.paid, 0))}</b></span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">Subjects <b>{subjects.length}</b></span>
                    {partialCount > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Partly paid <b>{partialCount}</b></span>}
                  </div>
                  {partialCount > 0 && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} /> Only fully paid candidates
                    </label>
                  )}
                </div>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => summaryPdf('download')} disabled={busy}><FileText className="mr-1 h-4 w-4" /> Summary PDF</Button>
                    <Button variant="outline" onClick={() => summaryPdf('print')} disabled={busy}><Printer className="mr-1 h-4 w-4" /> Print Summary</Button>
                    <Button onClick={() => pdf(subjects, 'download', `${baseName}-All-Subjects.pdf`)} disabled={busy}><FileDown className="mr-1 h-4 w-4" /> All Subjects PDF</Button>
                    <Button variant="outline" onClick={() => pdf(subjects, 'print', '')} disabled={busy}><Printer className="mr-1 h-4 w-4" /> Print All</Button>
                    <Button variant="outline" onClick={() => excel(subjects, `${baseName}.xlsx`)}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
                  </div>
                )}
              </div>

              {subjects.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">No fee payments found for this exam.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Candidates</th><th className="px-3 py-2 text-right">Download</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subjects.map((s, i) => (
                        <FragmentRow key={s.subject} groupHeading={i === 0 || subjects[i - 1].subject_group !== s.subject_group ? groupTitle(s.subject_group) : ''} s={s} open={open === s.subject} onToggle={() => setOpen(open === s.subject ? null : s.subject)}
                          onPdf={() => pdf([s], 'download', `${baseName}-${fileSafe(s.subject)}.pdf`)}
                          onExcel={() => excel([s], `${baseName}-${fileSafe(s.subject)}.xlsx`)} busy={busy} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PanelLayout>
  )
}

function FragmentRow({ s, groupHeading, open, onToggle, onPdf, onExcel, busy }: {
  s: SubjectList; groupHeading: string; open: boolean; onToggle: () => void; onPdf: () => void; onExcel: () => void; busy: boolean
}) {
  return (
    <>
      {groupHeading && (
        <tr className="bg-blue-50">
          <td colSpan={4} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-900">{groupHeading}</td>
        </tr>
      )}
      <tr className="hover:bg-gray-50">
        <td className="px-3 py-2">
          <button onClick={onToggle} className="inline-flex items-center gap-1 text-left font-medium text-gray-900 hover:text-blue-700" aria-expanded={open}>
            {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />} {s.subject}
          </button>
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {s.types.map((t) => (
              <span key={t} className={`rounded px-1.5 py-0.5 text-xs ${t === 'compulsory' ? 'bg-blue-50 text-blue-800' : t === 'optional' ? 'bg-purple-50 text-purple-800' : 'bg-emerald-50 text-emerald-800'}`}>{TYPE_LABEL[t]}</span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2 text-right font-semibold">{s.count}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right">
          <div className="inline-flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={onPdf} disabled={busy} aria-label={`Download ${s.subject} PDF`}><FileDown className="mr-1 h-3.5 w-3.5" /> PDF</Button>
            <Button size="sm" variant="secondary" onClick={onExcel} aria-label={`Download ${s.subject} Excel`}><FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Excel</Button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} className="bg-gray-50 px-3 py-3">
            <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 bg-gray-100 text-left text-gray-600">
                  <tr><th className="px-2 py-1.5">SL</th><th className="px-2 py-1.5">Student ID</th><th className="px-2 py-1.5">Roll</th><th className="px-2 py-1.5">Name</th><th className="px-2 py-1.5">Group</th><th className="px-2 py-1.5">Type</th><th className="px-2 py-1.5 text-right">Paid (৳)</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.students.map((x, i) => (
                    <tr key={x.student_id}>
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono">{x.student_id}</td>
                      <td className="px-2 py-1.5">{x.class_roll || '-'}</td>
                      <td className="px-2 py-1.5">{x.name}</td>
                      <td className="px-2 py-1.5">{x.group}</td>
                      <td className="px-2 py-1.5">{TYPE_LABEL[x.type || ''] || '-'}</td>
                      <td className="px-2 py-1.5 text-right">{tk(x.paid)}{x.status === 'partial' && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">partial</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
