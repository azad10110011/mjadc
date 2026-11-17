'use client'

// Board Exam Management › Candidates (Session 99): candidates of other colleges, imported from Excel/CSV.
// Columns (any order, flexible names): Roll, Reg No, Name, College, Group, Gender, Type, Subjects (codes, comma separated).

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, DataTable } from '@/components/ui'
import { api } from '@/lib/api'
import { useBoardExam } from '@/lib/boardExam'
import { BoardExamBar } from '@/components/board/BoardExamBar'
import { FileSpreadsheet, Upload, Trash2, Download, X, Search } from 'lucide-react'

interface Candidate {
  id: number; roll_no: string; reg_no: string | null; name: string; college: string; group_name: string | null; gender: string | null
  candidate_type: string | null; subjects: string[]; seat_no: string | null; room_name: string | null; venue_name: string | null
}
type Row = { roll_no: string; reg_no: string; name: string; college: string; group_name: string; gender: string; candidate_type: string; subjects: string }

// heading (lower-case, no spaces/punctuation) → field
const ALIASES: Record<string, keyof Row> = {
  roll: 'roll_no', rollno: 'roll_no', rollnumber: 'roll_no', boardroll: 'roll_no',
  reg: 'reg_no', regno: 'reg_no', registration: 'reg_no', registrationno: 'reg_no', registrationnumber: 'reg_no',
  name: 'name', candidatename: 'name', studentname: 'name', examineename: 'name',
  college: 'college', collegename: 'college', institute: 'college', institution: 'college', institutename: 'college', school: 'college',
  group: 'group_name', groupname: 'group_name', department: 'group_name',
  gender: 'gender', sex: 'gender',
  type: 'candidate_type', candidatetype: 'candidate_type', status: 'candidate_type',
  subjects: 'subjects', subject: 'subjects', subjectcodes: 'subjects', subjectcode: 'subjects', papers: 'subjects', papercodes: 'subjects',
}
const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '')

export default function BoardCandidatesPage() {
  const { exams, exam, examId, setExamId, reload, loaded } = useBoardExam()
  const [list, setList] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [parsed, setParsed] = useState<{ file: string; rows: Row[]; unknown: string[] } | null>(null)
  const [replace, setReplace] = useState(false)
  const [q, setQ] = useState('')
  const [college, setCollege] = useState('')

  const load = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    try { setList((await api.get<{ data: Candidate[] }>(`/admin/board-exams/${examId}/candidates`)).data || []) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }) }
    finally { setLoading(false) }
  }, [examId])
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); await Promise.all([load(), reload()]) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }

  const readFile = async (f: File) => {
    setMsg(null)
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false })
      if (!raw.length) { setMsg({ ok: false, text: 'The file has no rows.' }); return }
      const heads = Object.keys(raw[0])
      const map = new Map<string, keyof Row>()
      const unknown: string[] = []
      for (const h of heads) { const k = ALIASES[norm(h)]; if (k) map.set(h, k); else unknown.push(h) }
      if (![...map.values()].includes('roll_no') || ![...map.values()].includes('name')) {
        setMsg({ ok: false, text: `Could not find "Roll" and "Name" columns. Found: ${heads.join(', ')}. Download the template to see the expected headings.` }); return
      }
      const rows = raw.map((r) => {
        const o: Row = { roll_no: '', reg_no: '', name: '', college: '', group_name: '', gender: '', candidate_type: '', subjects: '' }
        for (const [h, k] of map) o[k] = String(r[h] ?? '').trim()
        return o
      }).filter((r) => r.roll_no || r.name)
      setParsed({ file: f.name, rows, unknown })
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? `Could not read the file: ${e.message}` : 'Could not read the file' }) }
  }

  const doImport = () => parsed && examId && run(async () => {
    const r = await api.post<{ message: string }>(`/admin/board-exams/${examId}/candidates/import`, { rows: parsed.rows, replace })
    setParsed(null); setReplace(false)
    return r.message
  })

  const template = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Roll', 'Reg No', 'Name', 'College', 'Group', 'Gender', 'Type', 'Subjects'],
      ['512345', '1712345678', 'MD. RAHIM UDDIN', 'Sample College', 'Science', 'Male', 'Regular', '101,102,107,108,275,174,175,176,177,265,266'],
      ['512346', '1712345679', 'MST. KARIMA KHATUN', 'Sample College', 'Humanities', 'Female', 'Regular', '101,102,107,108,275,269,270,286,287,304,305'],
    ])
    ws['!cols'] = [{ wch: 10 }, { wch: 13 }, { wch: 26 }, { wch: 26 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 50 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates')
    XLSX.writeFile(wb, 'Board-Candidates-Template.xlsx')
  }

  const colleges = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of list) m.set(c.college, (m.get(c.college) || 0) + 1)
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [list])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((c) => (!college || c.college === college) &&
      (!s || c.roll_no.toLowerCase().includes(s) || c.name.toLowerCase().includes(s) || (c.reg_no || '').toLowerCase().includes(s)))
  }, [list, q, college])
  const seated = list.filter((c) => c.seat_no).length

  const delCollege = () => {
    const label = college || 'ALL colleges'
    if (!confirm(`Delete every candidate of ${label}${exam ? ` in ${exam.name} ${exam.year}` : ''}? Their seats are removed too.`)) return
    run(async () => (await api.delete<{ message: string }>(`/admin/board-exams/${examId}/candidates${college ? `?college=${encodeURIComponent(college)}` : ''}`)).message)
  }

  const columns = [
    { key: 'roll_no', label: 'Roll' }, { key: 'reg_no', label: 'Reg. No' }, { key: 'name', label: 'Name' }, { key: 'college', label: 'College' },
    { key: 'group_name', label: 'Group' }, { key: 'gender', label: 'Gender' }, { key: 'subjects', label: 'Subjects' }, { key: 'seat', label: 'Seat' }, { key: 'actions', label: '' },
  ]
  const rows = shown.map((c) => ({
    ...c,
    roll_no: <span className="font-mono font-semibold">{c.roll_no}</span>,
    reg_no: c.reg_no || '—', group_name: c.group_name || '—', gender: c.gender || '—',
    subjects: <span className="text-xs text-gray-600">{c.subjects.join(', ') || <i className="text-amber-700">none</i>}</span>,
    seat: c.seat_no ? <span className="text-xs">{c.venue_name} · {c.room_name} · #{c.seat_no}</span> : <span className="text-xs text-gray-400">not seated</span>,
    actions: <button type="button" onClick={() => { if (confirm(`Remove ${c.roll_no} ${c.name}?`)) run(async () => (await api.delete<{ message: string }>(`/admin/board-candidates/${c.id}`)).message) }}
      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${c.roll_no}`}><Trash2 className="h-4 w-4" /></button>,
  }))

  return (
    <PanelLayout role="admin" title="Board Candidates">
      <div className="space-y-5">
        <BoardExamBar exams={exams} examId={examId} onChange={setExamId} loaded={loaded} />
        {msg && <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}

        {exam && (
          <>
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><FileSpreadsheet className="h-5 w-5 text-green-700" /> Import candidates</h2>
                  <Button size="sm" variant="secondary" onClick={template}><Download className="mr-1 h-3.5 w-3.5" /> Template (.xlsx)</Button>
                </div>
                <p className="text-sm text-gray-600">Excel or CSV with headings <b>Roll, Reg No, Name, College, Group, Gender, Type, Subjects</b>. Subjects = the board subject codes the candidate sits (e.g. <code>101,102,107,108,275,174</code>) — they must match the codes in the Board Routine. Existing rolls are updated.</p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <span><b className="text-blue-700">Choose a file</b> (.xlsx, .xls, .csv)</span>
                  <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = '' }} />
                </label>
                {parsed && (
                  <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <p className="text-sm"><b>{parsed.file}</b>: {parsed.rows.length} candidate row(s){parsed.unknown.length ? <span className="text-amber-700"> · ignored columns: {parsed.unknown.join(', ')}</span> : null}</p>
                    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-left text-gray-500"><tr>{['Roll', 'Reg', 'Name', 'College', 'Group', 'Gender', 'Subjects'].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
                        <tbody>{parsed.rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-gray-100"><td className="px-2 py-1 font-mono">{r.roll_no}</td><td className="px-2 py-1">{r.reg_no}</td><td className="px-2 py-1">{r.name}</td><td className="px-2 py-1">{r.college}</td><td className="px-2 py-1">{r.group_name}</td><td className="px-2 py-1">{r.gender}</td><td className="px-2 py-1">{r.subjects}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace all existing candidates of this exam (otherwise add / update by roll)</label>
                    <div className="flex gap-2">
                      <Button onClick={doImport} disabled={busy}><Upload className="mr-1 h-4 w-4" /> {busy ? 'Importing…' : `Import ${parsed.rows.length}`}</Button>
                      <Button variant="ghost" onClick={() => setParsed(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">Candidates <b>{list.length}</b></span>
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-800">Seated <b>{seated}</b></span>
                  {colleges.map(([c, n]) => <span key={c} className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{c || '(no college)'} <b>{n}</b></span>)}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search roll, reg. no or name" aria-label="Search candidates"
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" />
                  </div>
                  <select value={college} onChange={(e) => setCollege(e.target.value)} aria-label="Filter by college" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">All colleges</option>
                    {colleges.map(([c, n]) => <option key={c} value={c}>{c || '(no college)'} ({n})</option>)}
                  </select>
                  <span className="text-sm text-gray-500">Showing {shown.length}</span>
                  {list.length > 0 && <Button size="sm" variant="danger" className="ml-auto" onClick={delCollege} disabled={busy}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete {college ? 'this college' : 'all'}</Button>}
                </div>
                <DataTable columns={columns} data={rows} loading={loading} emptyMessage={list.length ? 'No candidates match' : 'No candidates yet — import a file above'} stickyScrollbar />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PanelLayout>
  )
}
