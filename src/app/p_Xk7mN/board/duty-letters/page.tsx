'use client'

// Board Exam Management › Board Duty Letters (Session 99): appointment letters from the FINALIZED board
// hall-duty schedule. External teachers' letters are addressed to their own college.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { zipSync } from 'fflate'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { api } from '@/lib/api'
import { dutyLettersPdf, finishPdf, fmtTime, letterFileName, loadLogo, type LetterSettings, type LetterTeacher } from '@/lib/examPdf'
import { examTitle, useBoardExam, type BoardExam } from '@/lib/boardExam'
import { BoardExamBar } from '@/components/board/BoardExamBar'
import { FileDown, Printer, Archive, Save, Lock } from 'lucide-react'

interface Cfg { memo_no: string | null; issue_date: string | null; signatory_name: string | null; signatory_designation: string | null; reporting_minutes: number; instructions: string | null }
type BT = LetterTeacher & { type: 'internal' | 'external'; mobile: string | null }
const DEFAULT_INSTRUCTIONS = [
  'Report to the centre secretary / examination office before the reporting time and sign the attendance register.',
  'Collect question papers, answer scripts and attendance sheets for your room.',
  'Check every examinee’s admit card, registration card and seat number before the exam starts.',
  'Mobile phones and any unfair means are strictly prohibited in the examination hall.',
  'Follow the Education Board’s rules; return all papers and the signed attendance sheet after the exam.',
].join('\n')
const niceDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }

export default function BoardDutyLettersPage() {
  const { exams, exam, examId, setExamId, loaded } = useBoardExam()
  const [teachers, setTeachers] = useState<BT[]>([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'' | 'internal' | 'external'>('')
  const [form, setForm] = useState({ memo_no: '', issue_date: '', signatory_name: '', signatory_designation: 'Centre Secretary', reporting_minutes: 30, instructions: DEFAULT_INSTRUCTIONS })

  const load = useCallback(async () => {
    if (!examId) return
    try {
      const r = await api.get<{ data: { exam: BoardExam & { config: Cfg }; teachers: BT[] } }>(`/admin/board-duty/${examId}/letters`)
      const c = r.data.exam.config
      setTeachers(r.data.teachers); setError(''); setSelected(new Set(r.data.teachers.map((t) => t.id)))
      setForm({ memo_no: c.memo_no || '', issue_date: c.issue_date || new Date().toISOString().slice(0, 10), signatory_name: c.signatory_name || '',
        signatory_designation: c.signatory_designation || 'Centre Secretary', reporting_minutes: c.reporting_minutes || 30, instructions: c.instructions || DEFAULT_INSTRUCTIONS })
    } catch (e) { setTeachers([]); setError(e instanceof Error ? e.message : 'Failed to load') }
  }, [examId])
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

  const settings = (): LetterSettings => ({
    examTitle: exam ? examTitle(exam) : '', classes: [], memoNo: form.memo_no, issueDate: form.issue_date,
    signatoryName: form.signatory_name, signatoryDesignation: form.signatory_designation, reportingMinutes: Number(form.reporting_minutes) || 30, instructions: form.instructions,
  })
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teachers.filter((t) => (!type || t.type === type) && (!q || `${t.name} ${t.college || ''} ${t.subject || ''}`.toLowerCase().includes(q)))
  }, [teachers, search, type])
  const chosen = teachers.filter((t) => selected.has(t.id))

  const saveDetails = async () => {
    setBusy(true); setMsg(null)
    try { await api.put(`/admin/board-duty/${examId}/config`, form); setMsg({ ok: true, text: 'Letter details saved.' }) }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
    finally { setBusy(false) }
  }
  const one = async (t: BT, mode: 'download' | 'print') => finishPdf(dutyLettersPdf([t], settings(), await loadLogo()), letterFileName(t), mode)
  const combined = async (mode: 'download' | 'print') => {
    if (!chosen.length || !exam) return
    setBusy(true)
    try { finishPdf(dutyLettersPdf(chosen, settings(), await loadLogo()), `Board-Duty-Letters-${examTitle(exam)}.pdf`.replace(/\s+/g, '-'), mode) }
    finally { setBusy(false) }
  }
  const zip = async () => {
    if (!chosen.length || !exam) return
    setBusy(true); setMsg(null)
    try {
      const logo = await loadLogo(); const s = settings(); const files: Record<string, Uint8Array> = {}
      for (const t of chosen) { let n = letterFileName(t); for (let i = 2; files[n]; i++) n = letterFileName(t).replace('.pdf', `-${i}.pdf`); files[n] = new Uint8Array(dutyLettersPdf([t], s, logo).output('arraybuffer')) }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([zipSync(files, { level: 6 }) as BlobPart], { type: 'application/zip' }))
      a.download = `Board-Duty-Letters-${examTitle(exam)}.zip`.replace(/\s+/g, '-')
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      setMsg({ ok: true, text: `ZIP with ${chosen.length} letter(s) downloaded.` })
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'ZIP failed' }) }
    finally { setBusy(false) }
  }
  const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <PanelLayout role="admin" title="Board Duty Letters">
      <div className="space-y-5">
        <BoardExamBar exams={exams} examId={examId} onChange={setExamId} loaded={loaded} />
        {error && <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Lock className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error} <Link href="/p_Xk7mN/board/hall-duty" className="underline">Board Hall Duty</Link></span></p>}
        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
        {exam && !error && teachers.length > 0 && (
          <>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h3 className="font-semibold text-gray-900">Letter details</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input label="Memo no." value={form.memo_no} onChange={(e) => setForm({ ...form, memo_no: e.target.value })} />
                  <Input label="Issue date" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
                  <Input label="Authorized person (name)" value={form.signatory_name} onChange={(e) => setForm({ ...form, signatory_name: e.target.value })} />
                  <Input label="Designation" value={form.signatory_designation} onChange={(e) => setForm({ ...form, signatory_designation: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <Input label="Report before (min)" type="number" min={0} max={180} value={form.reporting_minutes} onChange={(e) => setForm({ ...form, reporting_minutes: Number(e.target.value) })} />
                  <div><label htmlFor="instr" className="mb-1 block text-sm font-medium text-gray-700">Duty instructions (one per line)</label><textarea id="instr" rows={5} className={field} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
                </div>
                <Button variant="secondary" onClick={saveDetails} disabled={busy}><Save className="mr-1 h-4 w-4" /> Save details</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-auto font-semibold text-gray-900">{teachers.length} teacher(s) on duty ({teachers.filter((t) => t.type === 'external').length} external) · {chosen.length} selected</h3>
                  <Button size="sm" onClick={() => combined('download')} disabled={busy || !chosen.length}><FileDown className="mr-1 h-4 w-4" /> Selected — one PDF</Button>
                  <Button size="sm" variant="secondary" onClick={() => combined('print')} disabled={busy || !chosen.length}><Printer className="mr-1 h-4 w-4" /> Print selected</Button>
                  <Button size="sm" variant="secondary" onClick={zip} disabled={busy || !chosen.length}><Archive className="mr-1 h-4 w-4" /> Selected — ZIP</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search teachers" placeholder="Search teacher, college or subject" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm sm:w-64" />
                  <select value={type} onChange={(e) => setType(e.target.value as '' | 'internal' | 'external')} aria-label="Teacher type" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                    <option value="">All teachers</option><option value="internal">Our teachers</option><option value="external">External teachers</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="checkbox" checked={visible.length > 0 && visible.every((t) => selected.has(t.id))} onChange={(e) => setSelected((p) => { const n = new Set(p); visible.forEach((t) => (e.target.checked ? n.add(t.id) : n.delete(t.id))); return n })} /> Select all shown
                  </label>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="w-10 px-3 py-2" /><th className="px-3 py-2">Teacher</th><th className="px-3 py-2">Duties</th><th className="px-3 py-2">Letter</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {visible.map((t) => (
                        <tr key={t.id} className={selected.has(t.id) ? 'bg-blue-50/40' : ''}>
                          <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${t.name}`} checked={selected.has(t.id)} onChange={(e) => setSelected((p) => { const n = new Set(p); if (e.target.checked) n.add(t.id); else n.delete(t.id); return n })} /></td>
                          <td className="px-3 py-2"><p className="font-medium text-gray-900">{t.name} {t.type === 'external' && <span className="rounded bg-purple-100 px-1 text-[10px] font-semibold text-purple-800">EXT</span>}</p><p className="text-xs text-gray-500">{t.designation}{t.subject ? ` · ${t.subject}` : ''}{t.college ? ` · ${t.college}` : ''}</p></td>
                          <td className="px-3 py-2 text-xs text-gray-600">{t.duties.map((d) => `${niceDate(d.exam_date)} ${fmtTime(d.exam_time)} · ${d.room}`).join('  |  ')}</td>
                          <td className="px-3 py-2"><div className="flex gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => one(t, 'download')} aria-label={`Download letter for ${t.name}`}><FileDown className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="secondary" onClick={() => one(t, 'print')} aria-label={`Print letter for ${t.name}`}><Printer className="h-3.5 w-3.5" /></Button>
                          </div></td>
                        </tr>
                      ))}
                      {visible.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No teachers</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PanelLayout>
  )
}
